import 'dotenv/config'
import { v2 as cloudinary } from 'cloudinary'

const UPLOAD_FOLDER = 'bautizo-matias'
const PROBE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

// Los valores pegados en el panel de Render a veces arrastran espacios o saltos de línea
function readEnv(key) {
  return process.env[key]?.trim() ?? ''
}

function getCloudinaryConfig() {
  return {
    cloudName: readEnv('CLOUDINARY_CLOUD_NAME'),
    apiKey: readEnv('CLOUDINARY_API_KEY'),
    apiSecret: readEnv('CLOUDINARY_API_SECRET'),
  }
}

export function isCloudinaryConfigured() {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig()
  return Boolean(cloudName && apiKey && apiSecret)
}

if (isCloudinaryConfigured()) {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig()
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

function mask(value) {
  return value.length > 4 ? `***${value.slice(-4)}` : '***'
}

let diagnosticsLogged = false

// El SDK descarta el cuerpo y las cabeceras de respuestas como 403, así que
// se repite una vez una subida firmada mínima para registrar el motivo real.
// Nunca se registran el secret ni la firma.
export async function logCloudinaryUploadDiagnostics() {
  if (diagnosticsLogged) return
  diagnosticsLogged = true

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig()
  console.error('[cloudinary-diag] config', {
    cloudName,
    apiKey: mask(apiKey),
    cloudNameHadWhitespace: process.env.CLOUDINARY_CLOUD_NAME !== cloudName,
    apiKeyHadWhitespace: process.env.CLOUDINARY_API_KEY !== apiKey,
    apiSecretHadWhitespace: process.env.CLOUDINARY_API_SECRET !== apiSecret,
    cloudinaryUrlSet: Boolean(process.env.CLOUDINARY_URL),
    proxySet: Boolean(process.env.HTTPS_PROXY || process.env.HTTP_PROXY),
  })

  const params = {
    folder: UPLOAD_FOLDER,
    public_id: `diag-${Date.now()}`,
    timestamp: Math.round(Date.now() / 1000),
  }
  const form = new FormData()
  for (const [key, value] of Object.entries(params)) form.append(key, String(value))
  form.append('api_key', apiKey)
  form.append('signature', cloudinary.utils.api_sign_request(params, apiSecret))
  form.append('file', PROBE_PNG)

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: 'POST', body: form }
    )
    const body = await response.text()
    console.error('[cloudinary-diag] response', {
      status: response.status,
      xCldError: response.headers.get('x-cld-error'),
      requestId: response.headers.get('x-request-id'),
      server: response.headers.get('server'),
      contentType: response.headers.get('content-type'),
      body: body.slice(0, 500),
    })

    if (response.ok) {
      await cloudinary.uploader
        .destroy(`${UPLOAD_FOLDER}/${params.public_id}`)
        .catch(() => {})
    }
  } catch (error) {
    console.error('[cloudinary-diag] network error', error?.code, error?.message)
  }
}

export async function uploadBufferToCloudinary(buffer, mimeType, publicId) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary no está configurado; no se guardó ninguna fotografía.')
  }

  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${buffer.toString('base64')}`,
    {
      public_id: publicId,
      folder: UPLOAD_FOLDER,
      resource_type: 'image',
    }
  )

  return result
}

export async function deleteFromCloudinary(publicIds) {
  await Promise.allSettled(
    publicIds.map((publicId) => cloudinary.uploader.destroy(publicId))
  )
}
