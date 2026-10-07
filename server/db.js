import { randomUUID } from 'node:crypto'
import pg from 'pg'

const { Pool } = pg

const basePhotoTemplate = [
  {
    id: 'seed-1',
    guest_name: 'Mamá',
    message: 'Muchas felicidades Matías ❤️',
    image_url:
      'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=80',
    cloudinary_public_id: 'seed-1',
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'seed-2',
    guest_name: 'Tío José',
    message: 'Qué alegría compartir este día contigo.',
    image_url:
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
    cloudinary_public_id: 'seed-2',
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'seed-3',
    guest_name: 'Abuela',
    message: 'Te queremos muchísimo, Matías.',
    image_url:
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80',
    cloudinary_public_id: 'seed-3',
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'seed-4',
    guest_name: 'Familia',
    message: 'Gracias por este recuerdo tan especial.',
    image_url:
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
    cloudinary_public_id: 'seed-4',
    status: 'approved',
    created_at: new Date().toISOString(),
  },
]

const memoryStore = {
  photos: basePhotoTemplate.map((photo) => ({
    event_id: 'bautizo-matias',
    ...photo,
  })),
}

let pool = null

function ensureDatabaseConnection() {
  if (!process.env.DATABASE_URL) return null

  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }

  return pool
}

async function ensureTable() {
  const db = ensureDatabaseConnection()
  if (!db) return

  await db.query(`
    CREATE TABLE IF NOT EXISTS photos (
      id UUID PRIMARY KEY,
      event_id TEXT NOT NULL,
      guest_name TEXT,
      message TEXT,
      image_url TEXT NOT NULL,
      cloudinary_public_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

function normalizePhoto(photo) {
  return {
    id: photo.id,
    event_id: photo.event_id ?? 'bautizo-matias',
    guest_name: photo.guest_name ?? 'Invitado',
    message: photo.message ?? '',
    image_url: photo.image_url,
    cloudinary_public_id: photo.cloudinary_public_id ?? photo.id,
    status: photo.status ?? 'pending',
    created_at: photo.created_at ?? new Date().toISOString(),
  }
}

export async function getApprovedPhotos() {
  const db = ensureDatabaseConnection()

  if (db) {
    await ensureTable()
    const result = await db.query(
      'SELECT * FROM photos WHERE status = $1 ORDER BY created_at DESC',
      ['approved']
    )
    return result.rows.map(normalizePhoto)
  }

  return memoryStore.photos.filter((photo) => photo.status === 'approved')
}

export async function getPendingPhotos() {
  const db = ensureDatabaseConnection()

  if (db) {
    await ensureTable()
    const result = await db.query(
      'SELECT * FROM photos WHERE status = $1 ORDER BY created_at DESC',
      ['pending']
    )
    return result.rows.map(normalizePhoto)
  }

  return memoryStore.photos.filter((photo) => photo.status === 'pending')
}

export async function createPhotosFromUpload(files, guestName, message) {
  const db = ensureDatabaseConnection()
  const records = files.map((file) => {
    const id = randomUUID()
    return normalizePhoto({
      id,
      event_id: 'bautizo-matias',
      guest_name: guestName || 'Invitado',
      message: message || '',
      image_url: file.image_url,
      cloudinary_public_id: file.cloudinary_public_id || id,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
  })

  if (db) {
    await ensureTable()

    for (const record of records) {
      await db.query(
        `INSERT INTO photos (id, event_id, guest_name, message, image_url, cloudinary_public_id, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          record.id,
          record.event_id,
          record.guest_name,
          record.message,
          record.image_url,
          record.cloudinary_public_id,
          record.status,
          record.created_at,
        ]
      )
    }
  } else {
    memoryStore.photos.unshift(...records)
  }

  return records
}

export async function updatePhotoStatus(id, status) {
  const db = ensureDatabaseConnection()

  if (db) {
    await ensureTable()
    const result = await db.query(
      'UPDATE photos SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    )

    if (result.rows.length === 0) {
      return null
    }

    return normalizePhoto(result.rows[0])
  }

  const photoIndex = memoryStore.photos.findIndex((photo) => photo.id === id)
  if (photoIndex === -1) return null

  memoryStore.photos[photoIndex] = {
    ...memoryStore.photos[photoIndex],
    status,
  }

  return normalizePhoto(memoryStore.photos[photoIndex])
}

export async function deletePhotoById(id) {
  const db = ensureDatabaseConnection()

  if (db) {
    await ensureTable()
    const result = await db.query('DELETE FROM photos WHERE id = $1 RETURNING *', [id])
    return result.rows.length > 0
  }

  const before = memoryStore.photos.length
  memoryStore.photos = memoryStore.photos.filter((photo) => photo.id !== id)
  return before !== memoryStore.photos.length
}
