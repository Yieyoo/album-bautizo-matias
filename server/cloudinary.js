import { v2 as cloudinary } from 'cloudinary'

const hasCloudinaryConfig =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

const fallbackImages = [
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
]

export async function uploadBufferToCloudinary(buffer, mimeType, publicId) {
  if (!hasCloudinaryConfig) {
    const imageUrl = fallbackImages[Math.floor(Math.random() * fallbackImages.length)]
    return {
      secure_url: imageUrl,
      public_id: publicId,
    }
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
