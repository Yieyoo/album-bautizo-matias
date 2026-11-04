// Fotos fijas con las que empieza el álbum, elegidas por los papás de Matías.
// Los archivos viven en client/public/matias/ y se sirven junto con la página,
// sin pasar por Cloudinary ni por la revisión del panel familiar.
export const familyMessage = {
  title: 'Para Matías e invitados',
  text:
    'Desde que llegaste, nuestra vida se llenó de luz. Cada sonrisa tuya es un regalo que Dios nos da todos los días.\n\n' +
    'Hoy te presentamos ante Él rodeado de las personas que más te quieren, para que su amor te acompañe siempre en tu camino.\n\n' +
    'Gracias a todos por estar aquí y por guardar con nosotros los recuerdos de este día tan especial.',
  signature: 'De Matías para el mundo',
}

// Orden en que se reparten en el collage; `ratio` es alto entre ancho y
// `caption` la frase que va escrita debajo de cada foto
export const familyPhotoFiles = [
  { file: 'matias-01.jpg', ratio: 4 / 3, caption: 'Listo para mi gran día 😎' },
  { file: 'matias-09.jpg', ratio: 4 / 3, caption: 'Recién llegado y ya robando corazones' },
  { file: 'matias-02.jpg', ratio: 4 / 3, caption: 'Aquí, planeando mi próxima travesura' },
  { file: 'matias-05.jpg', ratio: 9 / 16, caption: 'Explorando el mundo, una cosa a la vez' },
  { file: 'matias-08.jpg', ratio: 16 / 9, caption: '¿Y mi mesa? Ya traigo hambre' },
  { file: 'matias-10.jpg', ratio: 4 / 3, caption: 'Sheriff oficial de la casa 🤠' },
  { file: 'matias-11.jpg', ratio: 4 / 3, caption: 'Copiloto feliz, siempre de buenas' },
  { file: 'matias-04.jpg', ratio: 4 / 3, caption: 'Seleccionado nacional… de apapachos' },
  { file: 'matias-12.jpg', ratio: 16 / 9, caption: 'Paseando con estilo, como todo un galán' },
  { file: 'matias-07.jpg', ratio: 4 / 3, caption: 'Las cámaras me aman 📸' },
  { file: 'matias-03.jpg', ratio: 4 / 3, caption: 'De compras en el mercado: yo escojo la fruta' },
  { file: 'matias-06.jpg', ratio: 4 / 3, caption: 'Primero me peino, luego conquisto' },
]

export const familyPhotos = familyPhotoFiles.map(({ file, ratio, caption }, index) => ({
  id: `familia-${index + 1}`,
  image_url: `${import.meta.env.BASE_URL}matias/${file}`,
  ratio,
  caption,
  guest_name: familyMessage.signature,
  message: caption,
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
