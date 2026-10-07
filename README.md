# Álbum del bautizo de Matías

Álbum familiar creado con React y Vite. La versión publicada como demo está en:

<https://yieyoo.github.io/album-bautizo-matias/>

## Publicación en GitHub Pages

El workflow `.github/workflows/pages.yml` compila `client/` y publica el resultado al hacer push a `main`.
En **Settings → Pages**, selecciona **GitHub Actions** como fuente de publicación.

## Demo y servidor

En GitHub Pages, la interfaz y la galería de ejemplo funcionan como una demo estática. Las fotos que se suban allí solo se conservan en memoria durante esa sesión y no se comparten con otros dispositivos. Para almacenamiento real y moderación compartida, ejecuta también el servidor Express y configura Cloudinary y PostgreSQL según `server/.env.example`.

## Desarrollo local

Instala las dependencias en `client/` y `server/`, inicia primero el servidor y después Vite:

```sh
cd server
npm install
npm run dev
```

En otra terminal:

```sh
cd client
npm install
npm run dev
```
