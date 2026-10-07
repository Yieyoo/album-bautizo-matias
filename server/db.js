import { randomUUID } from 'node:crypto'
import pg from 'pg'

const { Pool } = pg

const memoryStore = {
  photos: [],
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
  await db.query(
    'UPDATE photos SET status = $1 WHERE status = $2',
    ['published', 'approved']
  )
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

export async function getPublishedPhotos() {
  const db = ensureDatabaseConnection()

  if (db) {
    await ensureTable()
    const result = await db.query(
      'SELECT * FROM photos WHERE status = $1 ORDER BY created_at DESC',
      ['published']
    )
    return result.rows.map(normalizePhoto)
  }

  return memoryStore.photos.filter((photo) => photo.status === 'published')
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
      guest_name: guestName?.trim() || '',
      message: message?.trim() || '',
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
