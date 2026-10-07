import 'dotenv/config'
import { v2 as cloudinary } from 'cloudinary'

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  )
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

export async function uploadBufferToCloudinary(buffer, mimeType, publicId) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary no está configurado; no se guardó ninguna fotografía.')
  }

  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${buffer.toString('base64')}`,
    {
      public_id: publicId,
      folder: 'bautizo-matias',
      resource_type: 'image',
    }
  )

  return result
}
