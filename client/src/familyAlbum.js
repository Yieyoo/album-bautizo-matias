// Fotos fijas con las que empieza el álbum, elegidas por los papás de Matías.
// Los archivos viven en client/public/matias/ y se sirven junto con la página,
// sin pasar por Cloudinary ni por la revisión del panel familiar.
export const familyMessage = {
  title: 'Para nuestro Matías',
  text:
    'Desde que llegaste, nuestra vida se llenó de luz. Cada sonrisa tuya es un regalo que Dios nos da todos los días.\n\n' +
    'Hoy te presentamos ante Él rodeado de las personas que más te quieren, para que su amor te acompañe siempre en tu camino.\n\n' +
    'Gracias a todos por estar aquí y por guardar con nosotros los recuerdos de este día tan especial.',
  signature: 'Con amor, papá y mamá',
}

// Orden en que se reparten en el collage; `ratio` es alto entre ancho
export const familyPhotoFiles = [
  { file: 'matias-01.jpg', ratio: 4 / 3 },
  { file: 'matias-02.jpg', ratio: 4 / 3 },
  { file: 'matias-04.jpg', ratio: 4 / 3 },
  { file: 'matias-05.jpg', ratio: 9 / 16 },
  { file: 'matias-07.jpg', ratio: 4 / 3 },
  { file: 'matias-03.jpg', ratio: 4 / 3 },
  { file: 'matias-06.jpg', ratio: 4 / 3 },
]

export const familyPhotos = familyPhotoFiles.map(({ file, ratio }, index) => ({
  id: `familia-${index + 1}`,
  image_url: `${import.meta.env.BASE_URL}matias/${file}`,
  ratio,
  guest_name: familyMessage.signature,
  message: '',
}))

// Reparte las fotos en dos columnas poniendo cada una en la más corta,
// para que queden parejas y se lean de izquierda a derecha.
export function splitIntoColumns(photos) {
  const columns = [[], []]
  const heights = [0, 0]
  photos.forEach((photo, index) => {
    const target = heights[0] <= heights[1] ? 0 : 1
    columns[target].push({ photo, index })
    heights[target] += photo.ratio
  })
  return columns
}
