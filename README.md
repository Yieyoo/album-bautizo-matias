# Álbum del bautizo de Matías

Álbum familiar creado con React y Vite. La versión publicada como demo está en:

<https://yieyoo.github.io/album-bautizo-matias/>

## Publicación en GitHub Pages

El workflow `.github/workflows/pages.yml` compila `client/` y publica el resultado al hacer push a `main` cuando cambia `client/`, este README o el workflow.
En **Settings → Pages**, selecciona **GitHub Actions** como fuente de publicación.

## Demo y servidor

El formulario conserva los campos **Nombre (opcional)** y **Mensaje (opcional)** junto con las fotografías. Todas las fotos enviadas en una misma carga quedan agrupadas como un envío de esa persona; en el panel, la familia puede seleccionar una o varias fotos del grupo y publicarlas o archivarlas. Archivar conserva la fotografía fuera del álbum público y permite restaurarla después. La familia también puede eliminar fotografías permanentemente; el panel solicita confirmación antes de hacerlo. La familia puede ampliar y descargar fotografías desde el panel; los invitados solo ven las publicadas en el álbum. El nombre y mensaje aparecen con la fotografía solo después de publicarla.

GitHub Pages es estático: su demo no puede almacenar ni compartir las cargas entre invitados o dispositivos. Sin servidor conectado, el álbum muestra un aviso de que las fotografías están en revisión y no simula que los envíos llegaron a la familia. El acceso familiar ofrece un panel de demostración con contraseña `matias2026` y fotografías de ejemplo; no es una autenticación segura y sus acciones no se guardan ni afectan el álbum público. No reutilices esa contraseña para un panel real.

Para abrir la vista previa del acceso familiar directamente, visita <https://yieyoo.github.io/album-bautizo-matias/?admin>.

### Activar el flujo compartido

La configuración de `render.yaml` prepara una API Express en el plan gratuito de Render. Para que las fotos y envíos se conserven después de reinicios, usa Neon para PostgreSQL y Cloudinary para las imágenes; no guardes fotos ni la base de datos en el disco de Render, porque es temporal.

1. Crea una base de datos PostgreSQL en el plan gratuito de [Neon](https://neon.com/) y copia la cadena de conexión (`DATABASE_URL`) con SSL habilitado.
2. Crea una cuenta gratuita en [Cloudinary](https://cloudinary.com/) y ten a la mano el nombre de nube, API Key y API Secret.
3. En [Render](https://dashboard.render.com/), crea un **Blueprint** desde este repositorio y confirma el servicio `album-bautizo-matias-api` en plan **Free**. Render solicitará `DATABASE_URL` y las tres variables de Cloudinary; `ADMIN_PASSWORD` se genera automáticamente. Conserva esa contraseña desde el panel privado de Render y no la publiques.
4. Espera a que Render termine el deploy y copia la URL HTTPS del servicio.
5. En GitHub, abre **Settings → Secrets and variables → Actions → Variables** y crea `VITE_API_URL` con esa URL (sin `/` al final). Luego ejecuta manualmente el workflow **Deploy album to GitHub Pages** desde **Actions → Run workflow**.
6. Prueba una carga desde otro dispositivo, inicia sesión en `?admin`, revisa que aparezca pendiente, publícala, y confirma que aparece en el álbum. Comprueba también archivar/restaurar y guardar fotos desde el panel.

Los planes gratuitos **no garantizan disponibilidad ni costo cero para cualquier volumen**. Render puede dormir la API tras 15 minutos sin tráfico (el primer acceso puede tardar alrededor de un minuto), tiene horas y transferencia limitadas y puede suspender servicios si se rebasan ciertos límites. Neon tiene cuotas gratuitas y puede dormir la base; Cloudinary también aplica cuotas de almacenamiento y transferencia. Revisa el uso de cada cuenta con frecuencia y no agregues un método de pago si quieres evitar cargos automáticos; al exceder cuotas, el servicio puede dejar de aceptar tráfico o cargas. Las condiciones de los proveedores pueden cambiar.

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
