import { randomUUID } from 'node:crypto'
import pg from 'pg'

const { Pool } = pg

const memoryStore = {
  photos: [],
}

let pool = null
let tableInitialization = null

function ensureDatabaseConnection() {
  if (!process.env.DATABASE_URL) return null

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
    })
  }

  return pool
}

async function ensureTable() {
  const db = ensureDatabaseConnection()
  if (!db) return

  if (!tableInitialization) {
    tableInitialization = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS photos (
          id UUID PRIMARY KEY,
          event_id TEXT NOT NULL,
          guest_name TEXT,
          message TEXT,
          image_url TEXT NOT NULL,
          cloudinary_public_id TEXT,
          submission_id UUID,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `)
      await db.query(
        'ALTER TABLE photos ADD COLUMN IF NOT EXISTS submission_id UUID'
      )
      await db.query(
        'UPDATE photos SET status = $1 WHERE status = $2',
        ['published', 'approved']
      )
    })()
    tableInitialization.catch(() => {
      tableInitialization = null
    })
  }

  await tableInitialization
}

function normalizePhoto(photo) {
  return {
    id: photo.id,
    event_id: photo.event_id ?? 'bautizo-matias',
    guest_name: photo.guest_name ?? 'Invitado',
    message: photo.message ?? '',
    image_url: photo.image_url,
    cloudinary_public_id: photo.cloudinary_public_id ?? photo.id,
    submission_id: photo.submission_id ?? photo.id,
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

export async function getPhotoById(id) {
  const db = ensureDatabaseConnection()

  if (db) {
    await ensureTable()
    const result = await db.query(
      'SELECT * FROM photos WHERE id = $1',
      [id]
    )
    return result.rows[0] ? normalizePhoto(result.rows[0]) : null
  }

  const photo = memoryStore.photos.find((item) => item.id === id)
  return photo ? normalizePhoto(photo) : null
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

export async function getArchivedPhotos() {
  const db = ensureDatabaseConnection()

  if (db) {
    await ensureTable()
    const result = await db.query(
      'SELECT * FROM photos WHERE status = $1 ORDER BY created_at DESC',
      ['archived']
    )
    return result.rows.map(normalizePhoto)
  }

  return memoryStore.photos.filter((photo) => photo.status === 'archived')
}

export async function createPhotosFromUpload(files, guestName, message) {
  const db = ensureDatabaseConnection()
  const submissionId = randomUUID()
  const records = files.map((file) => {
    const id = randomUUID()
    return normalizePhoto({
      id,
      event_id: 'bautizo-matias',
      guest_name: guestName?.trim() || '',
      message: message?.trim() || '',
      image_url: file.image_url,
      cloudinary_public_id: file.cloudinary_public_id || id,
      submission_id: submissionId,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
  })

  if (db) {
    await ensureTable()

    for (const record of records) {
      await db.query(
        `INSERT INTO photos (id, event_id, guest_name, message, image_url, cloudinary_public_id, submission_id, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          record.id,
          record.event_id,
          record.guest_name,
          record.message,
          record.image_url,
          record.cloudinary_public_id,
          record.submission_id,
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
    const result = await db.query(
      'DELETE FROM photos WHERE id = $1 RETURNING *',
      [id]
    )
    return result.rows[0] ? normalizePhoto(result.rows[0]) : null
  }

  const photoIndex = memoryStore.photos.findIndex((photo) => photo.id === id)
  if (photoIndex === -1) return null

  const [photo] = memoryStore.photos.splice(photoIndex, 1)
  return normalizePhoto(photo)
}
