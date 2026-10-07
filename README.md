# Álbum del bautizo de Matías

Álbum familiar creado con React y Vite. La versión publicada como demo está en:

<https://yieyoo.github.io/album-bautizo-matias/>

## Publicación en GitHub Pages

El workflow `.github/workflows/pages.yml` compila `client/` y publica el resultado al hacer push a `main` cuando cambia `client/`, este README o el workflow.
En **Settings → Pages**, selecciona **GitHub Actions** como fuente de publicación.

## Demo y servidor

El formulario conserva los campos **Nombre (opcional)** y **Mensaje (opcional)** junto con las fotografías. Con el servidor configurado, cada envío se guarda con estado `pending`; la familia puede publicarlo, rechazarlo o eliminarlo desde el acceso familiar (`?admin`). El álbum público consulta únicamente fotografías con estado `published`; nombre y mensaje aparecen con la fotografía solo después de publicarla.

GitHub Pages es estático: su demo no puede almacenar ni compartir las cargas entre invitados o dispositivos. Para activar el flujo compartido, despliega el servidor Express y configura Cloudinary, PostgreSQL y `ADMIN_PASSWORD` según `server/.env.example`. Después, añade `VITE_API_URL` como variable del repositorio en GitHub con la URL HTTPS del backend y vuelve a desplegar Pages. Sin esa configuración, GitHub Pages seguirá mostrando la galería de demostración e indicará a los invitados que sus cargas no se comparten.

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
