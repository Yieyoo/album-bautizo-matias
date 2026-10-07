# Álbum del bautizo de Matías

Álbum familiar creado con React y Vite. La versión publicada como demo está en:

<https://yieyoo.github.io/album-bautizo-matias/>

## Publicación en GitHub Pages

El workflow `.github/workflows/pages.yml` compila `client/` y publica el resultado al hacer push a `main` cuando cambia `client/`, este README o el workflow.
En **Settings → Pages**, selecciona **GitHub Actions** como fuente de publicación.

## Demo y servidor

El formulario conserva los campos **Nombre (opcional)** y **Mensaje (opcional)** junto con las fotografías. Todas las fotos enviadas en una misma carga quedan agrupadas como un envío de esa persona; en el panel, la familia puede seleccionar una o varias fotos del grupo y publicarlas o archivarlas. Archivar conserva la fotografía fuera del álbum público y permite restaurarla después. La familia puede ampliar y descargar fotografías desde el panel; los invitados solo ven las publicadas en el álbum. El nombre y mensaje aparecen con la fotografía solo después de publicarla.

GitHub Pages es estático: su demo no puede almacenar ni compartir las cargas entre invitados o dispositivos. Sin servidor conectado, el álbum muestra un aviso de que las fotografías están en revisión y no simula que los envíos llegaron a la familia. El acceso familiar ofrece un panel de demostración con contraseña `matias2026` y fotografías de ejemplo; no es una autenticación segura y sus acciones no se guardan ni afectan el álbum público. No reutilices esa contraseña para un panel real.

Para abrir la vista previa del acceso familiar directamente, visita <https://yieyoo.github.io/album-bautizo-matias/?admin>.

Para activar el flujo compartido, despliega el servidor Express y configura Cloudinary, PostgreSQL y una contraseña segura mediante `ADMIN_PASSWORD` según `server/.env.example`. Después, añade `VITE_API_URL` como variable del repositorio en GitHub con la URL HTTPS del backend y vuelve a desplegar Pages.

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
