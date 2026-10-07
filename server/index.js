import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import {
  createPhotosFromUpload,
  deletePhotoById,
  getApprovedPhotos,
  getPendingPhotos,
  updatePhotoStatus,
} from './db.js'
import { uploadBufferToCloudinary } from './cloudinary.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 4000

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

app.get('/api/event', (req, res) => {
  res.json({
    event: {
      id: 'bautizo-matias',
      name: 'Matías',
      type: 'Bautizo',
      date: '7 de noviembre',
      qrLink: 'https://example.com/bautizo/matias',
      adminPath: '/admin',
    },
  })
})

app.get('/api/photos', async (req, res) => {
  const status = req.query.status === 'pending' ? 'pending' : 'approved'

  try {
    const photos =
      status === 'pending' ? await getPendingPhotos() : await getApprovedPhotos()

    res.json({ photos })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudieron cargar las fotos.' })
  }
})

app.post('/api/photos', upload.array('photos', 20), async (req, res) => {
  const files = req.files ?? []
  const guestName = req.body.guestName ?? ''
  const message = req.body.message ?? ''

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
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const publicId = `matias-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const uploadResult = await uploadBufferToCloudinary(
          file.buffer,
          file.mimetype,
          publicId
        )

        return {
          image_url: uploadResult.secure_url,
          cloudinary_public_id: uploadResult.public_id || publicId,
        }
      })
    )

    const createdPhotos = await createPhotosFromUpload(
      uploadedFiles,
      guestName,
      message
    )

    res.status(201).json({
      message: 'Tus fotografías se enviaron correctamente.',
      photos: createdPhotos,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudieron guardar tus fotos.' })
  }
})

app.patch('/api/photos/:id', async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['approved', 'pending', 'rejected'].includes(status)) {
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
  const { id } = req.params

  try {
    const deleted = await deletePhotoById(id)
    if (!deleted) {
      return res.status(404).json({ message: 'Foto no encontrada.' })
    }

    res.json({ message: 'Foto eliminada.' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'No se pudo eliminar la foto.' })
  }
})

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`)
})
