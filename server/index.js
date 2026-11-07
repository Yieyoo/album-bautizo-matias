import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import {
  createPhotosFromUpload,
  deletePhotoById,
  getPhotoById,
  getPublishedPhotos,
  getPendingPhotos,
  getArchivedPhotos,
  updatePhotoStatus,
} from './db.js'
import {
  deleteFromCloudinary,
  deletePhotoFromCloudinary,
  isCloudinaryConfigured,
  logCloudinaryUploadDiagnostics,
  uploadFileToCloudinary,
} from './cloudinary.js'

dotenv.config()

if (process.env.NODE_ENV === 'production') {
  const requiredConfiguration = [
    'DATABASE_URL',
    'ADMIN_PASSWORD',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ]
  const missingConfiguration = requiredConfiguration.filter((key) => !process.env[key])
  if (missingConfiguration.length) {
    throw new Error(`Missing production configuration: ${missingConfiguration.join(', ')}`)
  }
}

const app = express()
const port = process.env.PORT || 4000

// Render pasa las peticiones por un proxy; sin esto todas parecerían venir de la misma IP
app.set('trust proxy', 1)

app.use(cors())
app.use(express.json({ limit: '30mb' }))

// En disco temporal y no en memoria: con muchos invitados subiendo a la vez,
// la memoria del plan gratuito de Render (512 MB) se agotaría.
const upload = multer({
  storage: multer.diskStorage({ destination: tmpdir() }),
  limits: {
    files: 20,
    // Límite de Cloudinary en el plan gratuito
    fileSize: 10 * 1024 * 1024,
  },
})

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

async function removeTemporaryFiles(files) {
  await Promise.allSettled(files.map((file) => unlink(file.path)))
}

const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000

// Sesiones firmadas en vez de guardadas en memoria: siguen siendo válidas
// aunque Render reinicie o duerma el servidor. Cambiar ADMIN_PASSWORD las invalida.
function signAdminSession(expiresAt) {
  return createHmac('sha256', `admin-session:${process.env.ADMIN_PASSWORD}`)
    .update(String(expiresAt))
    .digest('hex')
}

function createAdminToken() {
  const expiresAt = Date.now() + ADMIN_SESSION_MS
  return `${expiresAt}.${signAdminSession(expiresAt)}`
}

function isAdminAuthenticated(req) {
  if (!process.env.ADMIN_PASSWORD) return false

  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const [expiresAtText, signature = ''] = token.split('.')
  const expiresAt = Number(expiresAtText)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false

  const expected = Buffer.from(signAdminSession(expiresAt))
  const received = Buffer.from(signature)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

const LOGIN_MAX_FAILURES = 5
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000
const failedLogins = new Map()

// Solo cuentan los intentos fallidos, para frenar a quien adivine contraseñas
// sin afectar a la familia cuando entra bien.
function getLoginLockRemainingMs(ip) {
  const entry = failedLogins.get(ip)
  if (!entry) return 0
  if (entry.resetAt <= Date.now()) {
    failedLogins.delete(ip)
    return 0
  }
  return entry.count >= LOGIN_MAX_FAILURES ? entry.resetAt - Date.now() : 0
}

function recordFailedLogin(ip) {
  const now = Date.now()
  // Limpia los bloqueos vencidos de otras IP para que el registro no crezca sin fin
  for (const [otherIp, otherEntry] of failedLogins) {
    if (otherEntry.resetAt <= now) failedLogins.delete(otherIp)
  }
  const entry = failedLogins.get(ip)
  if (!entry || entry.resetAt <= now) {
    failedLogins.set(ip, { count: 1, resetAt: now + LOGIN_LOCKOUT_MS })
  } else {
    entry.count += 1
  }
}

app.post('/api/admin/login', (req, res) => {
  const configuredPassword = process.env.ADMIN_PASSWORD
  if (!configuredPassword) {
    return res.status(503).json({ message: 'El acceso familiar no está configurado.' })
  }

  const lockRemainingMs = getLoginLockRemainingMs(req.ip)
  if (lockRemainingMs) {
    const minutes = Math.ceil(lockRemainingMs / 60000)
    return res.status(429).json({
      message: `Demasiados intentos. Espera ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} e intenta de nuevo.`,
    })
  }

  const submittedPassword = Buffer.from(String(req.body.password ?? ''))
  const expectedPassword = Buffer.from(configuredPassword)
  const matches =
    submittedPassword.length === expectedPassword.length &&
    timingSafeEqual(submittedPassword, expectedPassword)

  if (!matches) {
    recordFailedLogin(req.ip)
    return res.status(401).json({ message: 'Contraseña incorrecta. Intenta de nuevo.' })
  }

  failedLogins.delete(req.ip)
  res.json({ token: createAdminToken() })
})

app.get('/api/event', (req, res) => {
  res.json({
    event: {
      id: 'bautizo-matias',
      name: 'Matías',
      type: 'Bautizo',
      date: '7 de noviembre',
      qrLink: 'https://bautizomatias2026.com/',
      adminPath: '/admin',
    },
  })
})

app.get('/api/photos', async (req, res) => {
  const requestedStatus = req.query.status
  const status = ['pending', 'published', 'archived'].includes(requestedStatus)
    ? requestedStatus
    : 'published'
  if (status !== 'published' && !isAdminAuthenticated(req)) {
    return res.status(401).json({ message: 'Inicia sesión para revisar fotografías.' })
  }

  try {
    const photosByStatus = {
      pending: getPendingPhotos,
      published: getPublishedPhotos,
      archived: getArchivedPhotos,
    }
    const photos = await photosByStatus[status]()

    res.json({ photos })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudieron cargar las fotos.' })
  }
})

app.post('/api/photos', upload.array('photos', 20), async (req, res) => {
  if (!isCloudinaryConfigured()) {
    await removeTemporaryFiles(req.files ?? [])
    return res.status(503).json({
      message: 'El almacenamiento de fotografías no está configurado; no se guardó ningún archivo.',
    })
  }

  const files = req.files ?? []
  const guestName = req.body.guestName?.trim() ?? ''
  const message = req.body.message?.trim() ?? ''
  // El cliente sube una foto por petición y manda sus propios identificadores:
  // así las fotos de un envío quedan juntas y un reintento no crea duplicados.
  const submissionId = isUuid(req.body.submissionId) ? req.body.submissionId : randomUUID()
  let photoId = files.length === 1 && isUuid(req.body.photoId) ? req.body.photoId : undefined

  if (!files.length) {
    return res.status(400).json({ message: 'Debes seleccionar al menos una foto.' })
  }

  const invalidFiles = files.filter((file) => !allowedMimeTypes.includes(file.mimetype))

  if (invalidFiles.length > 0) {
    await removeTemporaryFiles(files)
    return res.status(400).json({
      message: 'Solo se permiten JPG, JPEG, PNG y WEBP de hasta 10 MB.',
    })
  }

  // El identificador lo manda el celular, así que nunca se reutiliza el de una
  // foto ya registrada: con overwrite en Cloudinary reemplazaría su imagen.
  // La única excepción es el reintento de una foto propia que ya se guardó
  // (sigue pendiente y es del mismo envío): se confirma sin volver a subirla.
  // Si no se puede consultar, tampoco se confía en el identificador recibido.
  if (photoId) {
    let existingPhoto
    try {
      existingPhoto = await getPhotoById(photoId)
    } catch {
      existingPhoto = { status: 'unknown' }
    }
    if (existingPhoto?.status === 'pending' && existingPhoto.submission_id === submissionId) {
      await removeTemporaryFiles(files)
      return res.status(201).json({
        message: 'Tus fotografías quedaron pendientes de revisión familiar.',
        photos: [existingPhoto],
      })
    }
    if (existingPhoto) photoId = undefined
  }

  const uploadedFiles = []
  try {
    for (const file of files) {
      const id = photoId ?? randomUUID()
      const uploadResult = await uploadFileToCloudinary(file.path, `matias-${id}`)
      uploadedFiles.push({
        id,
        image_url: uploadResult.secure_url,
        cloudinary_public_id: uploadResult.public_id,
      })
    }
  } catch (error) {
    await removeTemporaryFiles(files)
    console.error('Cloudinary upload failed', {
      name: error?.name,
      message: error?.message,
      http_code: error?.http_code,
      uploadedBeforeFailure: uploadedFiles.length,
    })
    if (error?.name === 'UnexpectedResponse') {
      await logCloudinaryUploadDiagnostics()
    }
    await deleteFromCloudinary(uploadedFiles.map((file) => file.cloudinary_public_id))
    return res.status(502).json({
      message: 'El servicio de fotografías rechazó la subida. Intenta más tarde.',
    })
  }

  await removeTemporaryFiles(files)

  try {
    const createdPhotos = await createPhotosFromUpload(
      uploadedFiles,
      guestName,
      message,
      submissionId
    )

    res.status(201).json({
      message: 'Tus fotografías quedaron pendientes de revisión familiar.',
      photos: createdPhotos,
    })
  } catch (error) {
    console.error('Saving uploaded photos failed', error)
    // Un reintento sobrescribe el archivo que un intento anterior pudo dejar
    // ya guardado en el álbum; solo se borra lo que seguro no quedó registrado.
    const unsavedFiles = []
    for (const file of uploadedFiles) {
      const savedPhoto = await getPhotoById(file.id).catch(() => true)
      if (!savedPhoto) unsavedFiles.push(file)
    }
    await deleteFromCloudinary(unsavedFiles.map((file) => file.cloudinary_public_id))
    res.status(500).json({ message: 'No se pudieron guardar tus fotos.' })
  }
})

app.get('/api/photos/:id/download', async (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ message: 'Inicia sesión para descargar fotografías.' })
  }

  try {
    const photo = await getPhotoById(req.params.id)
    if (!photo) {
      return res.status(404).json({ message: 'Foto no encontrada.' })
    }

    const imageUrl = new URL(photo.image_url)
    const isAllowedHost =
      imageUrl.protocol === 'https:' &&
      (imageUrl.hostname === 'images.unsplash.com' ||
        imageUrl.hostname === 'res.cloudinary.com' ||
        imageUrl.hostname.endsWith('.res.cloudinary.com'))
    if (!isAllowedHost) {
      return res.status(502).json({ message: 'No se pudo descargar la foto.' })
    }

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Image provider returned ${imageResponse.status}`)
    }

    const contentType = imageResponse.headers.get('content-type')?.split(';')[0]
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const extension = extensions[contentType]
    if (!extension) {
      return res.status(502).json({ message: 'El archivo no es una fotografía válida.' })
    }

    const image = Buffer.from(await imageResponse.arrayBuffer())
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="foto-matias.${extension}"`,
      'Content-Length': image.length,
      'Cache-Control': 'private, no-store',
    })
    res.send(image)
  } catch (error) {
    console.error('Error downloading published photo', error)
    res.status(502).json({ message: 'No se pudo descargar la foto.' })
  }
})

app.patch('/api/photos/:id', async (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ message: 'Inicia sesión para moderar fotografías.' })
  }

  const { id } = req.params
  const { status } = req.body

  if (!['published', 'pending', 'rejected', 'archived'].includes(status)) {
    return res.status(400).json({ message: 'Estado no válido.' })
  }

  try {
    const photo = await updatePhotoStatus(id, status)
    if (!photo) {
      return res.status(404).json({ message: 'Foto no encontrada.' })
    }

    res.json({ photo })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudo actualizar la foto.' })
  }
})

app.delete('/api/photos/:id', async (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ message: 'Inicia sesión para eliminar fotografías.' })
  }

  const { id } = req.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ message: 'Identificador de foto no válido.' })
  }

  try {
    const photo = await deletePhotoById(id)
    if (!photo) {
      return res.status(404).json({ message: 'Foto no encontrada.' })
    }

    let warning
    try {
      await deletePhotoFromCloudinary(photo.cloudinary_public_id)
    } catch (error) {
      console.error('Photo deleted from album but Cloudinary cleanup failed', error)
      warning = 'La foto se quitó del álbum, pero no se pudo borrar su archivo de Cloudinary.'
    }

    res.json({ photo: { id: photo.id }, warning })
  } catch (error) {
    console.error('Error deleting photo', error)
    res.status(500).json({ message: 'No se pudo eliminar la foto.' })
  }
})

// Multer rechaza archivos demasiado grandes antes de llegar a la ruta;
// sin esto Express respondería con una página de error en HTML.
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE'
    return res.status(tooLarge ? 413 : 400).json({
      message: tooLarge
        ? 'La foto pesa más de 10 MB.'
        : 'No se pudo recibir la foto.',
    })
  }
  next(error)
})

// Render duerme el plan gratuito tras 15 minutos sin tráfico y el primer
// invitado esperaría cerca de un minuto. Visitarse por la URL pública cuenta
// como tráfico; solo se hace hasta pasar el evento para no gastar horas gratis.
const KEEP_AWAKE_UNTIL = Date.parse('2026-11-10T06:00:00Z')
const KEEP_AWAKE_INTERVAL_MS = 10 * 60 * 1000

function keepAwake() {
  const publicUrl = process.env.RENDER_EXTERNAL_URL
  if (!publicUrl) return

  const timer = setInterval(() => {
    if (Date.now() > KEEP_AWAKE_UNTIL) {
      clearInterval(timer)
      return
    }
    fetch(`${publicUrl}/api/event`).catch((error) => {
      console.error('Keep-awake ping failed', error?.message)
    })
  }, KEEP_AWAKE_INTERVAL_MS)
}

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`)
  keepAwake()
})
