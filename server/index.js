import { randomBytes, timingSafeEqual } from 'node:crypto'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import {
  createPhotosFromUpload,
  getPhotoById,
  getPublishedPhotos,
  getPendingPhotos,
  getArchivedPhotos,
  updatePhotoStatus,
} from './db.js'
import { isCloudinaryConfigured, uploadBufferToCloudinary } from './cloudinary.js'

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
const adminSessions = new Map()

app.use(cors())
app.use(express.json({ limit: '30mb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 20,
    fileSize: 15 * 1024 * 1024,
  },
})

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

function isAdminAuthenticated(req) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '')
  const expiresAt = token ? adminSessions.get(token) : undefined
  if (!expiresAt || expiresAt <= Date.now()) {
    if (token) adminSessions.delete(token)
    return false
  }
  return true
}

app.post('/api/admin/login', (req, res) => {
  const configuredPassword = process.env.ADMIN_PASSWORD
  if (!configuredPassword) {
    return res.status(503).json({ message: 'El acceso familiar no está configurado.' })
  }

  const submittedPassword = Buffer.from(String(req.body.password ?? ''))
  const expectedPassword = Buffer.from(configuredPassword)
  const matches =
    submittedPassword.length === expectedPassword.length &&
    timingSafeEqual(submittedPassword, expectedPassword)

  if (!matches) {
    return res.status(401).json({ message: 'Contraseña incorrecta. Intenta de nuevo.' })
  }

  const token = randomBytes(32).toString('hex')
  adminSessions.set(token, Date.now() + 8 * 60 * 60 * 1000)
  res.json({ token })
})

app.get('/api/event', (req, res) => {
  res.json({
    event: {
      id: 'bautizo-matias',
      name: 'Matías',
      type: 'Bautizo',
      date: '7 de noviembre',
      qrLink: 'https://yieyoo.github.io/album-bautizo-matias/',
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
    return res.status(503).json({
      message: 'El almacenamiento de fotografías no está configurado; no se guardó ningún archivo.',
    })
  }

  const files = req.files ?? []
  const guestName = req.body.guestName?.trim() ?? ''
  const message = req.body.message?.trim() ?? ''

  if (!files.length) {
    return res.status(400).json({ message: 'Debes seleccionar al menos una foto.' })
  }

  const invalidFiles = files.filter(
    (file) => !allowedMimeTypes.includes(file.mimetype) || file.size > 15 * 1024 * 1024
  )

  if (invalidFiles.length > 0) {
    return res.status(400).json({
      message: 'Solo se permiten JPG, JPEG, PNG y WEBP de hasta 15 MB.',
    })
  }

  try {
    const uploadedFiles = []
    for (const file of files) {
      const publicId = `matias-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const uploadResult = await uploadBufferToCloudinary(
        file.buffer,
        file.mimetype,
        publicId
      )
      uploadedFiles.push({
        image_url: uploadResult.secure_url,
        cloudinary_public_id: uploadResult.public_id || publicId,
      })
    }

    const createdPhotos = await createPhotosFromUpload(
      uploadedFiles,
      guestName,
      message
    )

    res.status(201).json({
      message: 'Tus fotografías quedaron pendientes de revisión familiar.',
      photos: createdPhotos,
    })
  } catch (error) {
    console.error(error)
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

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`)
})
