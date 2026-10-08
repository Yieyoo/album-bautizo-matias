// Cloudinary (plan gratuito) rechaza imágenes de más de 10 MB o 25 megapíxeles.
// Las fotos que caben se suben originales; solo las demasiado grandes se ajustan.
const MAX_UPLOAD_BYTES = 9.5 * 1024 * 1024
const MAX_UPLOAD_PIXELS = 25_000_000
// Safari en iPhone no puede dibujar lienzos de más de ~16,7 MP.
const MAX_CANVAS_PIXELS = 16_000_000
const JPEG_QUALITY = 0.92

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer una de las fotos.'))
    }
    image.src = url
  })
}

function encodeJpeg(image, scale) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo preparar una de las fotos.'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}

export async function prepareImageForUpload(file) {
  const image = await loadImage(file)
  const pixels = image.naturalWidth * image.naturalHeight

  if (file.size <= MAX_UPLOAD_BYTES && pixels <= MAX_UPLOAD_PIXELS) {
    return file
  }

  let scale = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / pixels))
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const blob = await encodeJpeg(image, scale)
    if (blob.size <= MAX_UPLOAD_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, '') || 'foto'
      return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
    }
    scale *= 0.85
  }

  throw new Error('Una de las fotos es demasiado grande para subirla.')
}
