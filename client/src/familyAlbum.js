// Fotos fijas con las que empieza el álbum, elegidas por los papás de Matías.
// Los archivos viven en client/public/matias/ y se sirven junto con la página,
// sin pasar por Cloudinary ni por la revisión del panel familiar.
export const familyMessage = {
  title: 'Para Matías e invitados',
  text:
    'Desde que llegaste, nuestra vida se llenó de luz. Cada sonrisa tuya es un regalo que Dios nos da todos los días.\n\n' +
    'Hoy te presentamos ante Dios rodeado de las personas que más te quieren, para que su amor te acompañe siempre en tu camino.\n\n' +
    'Gracias a todos por estar aquí y por guardar con nosotros los recuerdos de este día tan especial.',
  signature: 'De Matías para el mundo',
}

// Orden en que se reparten en el collage; `ratio` es alto entre ancho y
// `caption` la frase que va escrita debajo de cada foto. `tape` es el color de la
// cinta, elegido a mano para que no se repita con la foto de arriba ni la de al lado
export const familyPhotoFiles = [
  { file: 'matias-01.jpg', ratio: 4 / 3, caption: 'Listo para mi gran día 😎', tape: 'crema' },
  { file: 'matias-09.jpg', ratio: 4 / 3, caption: 'Recién llegado y ya robando corazones', tape: 'dorado' },
  { file: 'matias-02.jpg', ratio: 4 / 3, caption: 'Aquí, planeando mi próxima travesura', tape: 'azul' },
  { file: 'matias-05.jpg', ratio: 9 / 16, caption: 'Explorando el mundo, una cosa a la vez', tape: 'crema' },
  { file: 'matias-08.jpg', ratio: 16 / 9, caption: '¿Y mi mesa? Ya traigo hambre', tape: 'azul' },
  { file: 'matias-10.jpg', ratio: 4 / 3, caption: 'Sheriff oficial de la casa 🤠', tape: 'dorado' },
  { file: 'matias-11.jpg', ratio: 4 / 3, caption: 'Copiloto feliz, siempre de buenas', tape: 'dorado' },
  { file: 'matias-04.jpg', ratio: 4 / 3, caption: 'Seleccionado nacional… de apapachos', tape: 'azul' },
  { file: 'matias-12.jpg', ratio: 16 / 9, caption: 'Paseando con estilo, como todo un galán', tape: 'azul' },
  { file: 'matias-07.jpg', ratio: 4 / 3, caption: 'Las cámaras me aman 📸', tape: 'crema' },
  { file: 'matias-03.jpg', ratio: 4 / 3, caption: 'De compras en el mercado: yo escojo la fruta', tape: 'dorado' },
  { file: 'matias-06.jpg', ratio: 4 / 3, caption: 'Primero me peino, luego conquisto', tape: 'crema' },
]

export const familyPhotos = familyPhotoFiles.map(({ file, ratio, caption, tape }, index) => ({
  id: `familia-${index + 1}`,
  image_url: `${import.meta.env.BASE_URL}matias/${file}`,
  ratio,
  caption,
  tape,
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

// Para las fotos de los invitados: colores y ángulos en secuencias de distinto
// largo, así la combinación tarda en repetirse y se ve puesta al azar
const tapeColors = ['crema', 'azul', 'crema', 'dorado', 'azul', 'dorado', 'crema']
const tapeAngles = [-4, 5, -2, 3, -6]

export function tapeFor(position, color) {
  return {
    className: `tape-${color ?? tapeColors[position % tapeColors.length]}`,
    style: { '--tape-rotate': `${tapeAngles[position % tapeAngles.length]}deg` },
  }
}
