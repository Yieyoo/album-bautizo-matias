import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import './App.css'

const validImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const isStaticDemo = import.meta.env.PROD && !apiUrl
const demoAdminPassword = 'matias2026'
const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}`

const demoPendingPhotos = [
  {
    id: 'demo-pending-1',
    guest_name: 'Tía Mariana',
    message: 'Un día muy especial para toda la familia. ¡Te queremos, Matías!',
    image_url: 'https://images.unsplash.com/photo-1731743214989-9b4d60937ddf?auto=format&fit=crop&w=900&q=80',
    status: 'pending',
  },
  {
    id: 'demo-pending-2',
    guest_name: 'Abuelita',
    message: 'Que Dios te acompañe y bendiga siempre.',
    image_url: 'https://images.unsplash.com/photo-1787214091915-994e9806ff9d?auto=format&fit=crop&w=900&q=80',
    status: 'pending',
  },
]

const demoPublishedPhotos = [
  {
    id: 'demo-published-1',
    guest_name: 'Familia García',
    message: 'Celebrando juntos este hermoso día.',
    image_url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80',
    status: 'published',
  },
]

function App() {
  const [publishedPhotos, setPublishedPhotos] = useState([])
  const [pendingPhotos, setPendingPhotos] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [guestName, setGuestName] = useState('')
  const [message, setMessage] = useState('')
  const [view, setView] = useState(
    new URLSearchParams(window.location.search).has('admin') ? 'admin' : 'home'
  )
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminError, setAdminError] = useState('')
  const fileInputRef = useRef(null)
  const touchStartX = useRef(null)

  useEffect(() => {
    loadPublishedPhotos()
  }, [])

  useEffect(() => {
    if (view === 'admin' && isAdminAuthenticated) {
      loadPendingPhotos()
    }
  }, [view, isAdminAuthenticated, adminToken])

  useEffect(() => {
    if (!uploading) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setUploadProgress((current) => {
        if (current >= 92) {
          return 92
        }

        return current + 12
      })
    }, 220)

    return () => window.clearInterval(intervalId)
  }, [uploading])

  async function loadPublishedPhotos() {
    if (isStaticDemo) {
      return
    }

    try {
      const response = await fetch(`${apiUrl}/api/photos?status=published`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar los recuerdos.')
      }
      setPublishedPhotos(data.photos ?? [])
    } catch (error) {
      console.error('Error loading published photos', error)
      setStatusMessage(error.message)
    }
  }

  async function loadPendingPhotos() {
    if (isStaticDemo) {
      return
    }

    try {
      const response = await fetch(`${apiUrl}/api/photos?status=pending`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar las fotos pendientes.')
      }
      setPendingPhotos(data.photos ?? [])
    } catch (error) {
      console.error('Error loading pending photos', error)
      setAdminError(error.message)
    }
  }

  function handlePhotoPick(event) {
    const files = Array.from(event.target.files ?? [])
    const validFiles = files.filter(
      (file) => validImageTypes.includes(file.type) && file.size <= 15 * 1024 * 1024
    )

    if (!validFiles.length) {
      setStatusMessage('Solo JPG, JPEG, PNG y WEBP hasta 15 MB.')
      return
    }

    const limitedFiles = validFiles.slice(0, 20)
    setSelectedFiles(limitedFiles)
    setStatusMessage('')
    setView('upload')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleRemoveSelected(indexToRemove) {
    setSelectedFiles((current) => current.filter((_, index) => index !== indexToRemove))
  }

  async function handleSubmitPhotos() {
    if (!selectedFiles.length) {
      setStatusMessage('Selecciona al menos una foto para compartir.')
      return
    }

    if (isStaticDemo) {
      setStatusMessage('Esta demo no está conectada al servidor: tus fotografías no se enviaron a la familia.')
      return
    }

    const formData = new FormData()
    selectedFiles.forEach((file) => formData.append('photos', file))
    formData.append('guestName', guestName)
    formData.append('message', message)

    try {
      setUploading(true)
      setUploadProgress(10)
      setStatusMessage('Subiendo tus fotos...')

      let data
      const response = await fetch(`${apiUrl}/api/photos`, {
        method: 'POST',
        body: formData,
      })

      data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron guardar las fotos.')
      }

      setUploadProgress(100)
      setSelectedFiles([])
      setGuestName('')
      setMessage('')
      setView('confirm')
      setUploading(false)
      setStatusMessage(data.message || 'Tus fotos quedaron pendientes de revisión familiar.')
    } catch (error) {
      setStatusMessage(error.message)
      setUploading(false)
    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault()

    try {
      if (isStaticDemo) {
        if (adminPassword !== demoAdminPassword) {
          throw new Error('Contraseña incorrecta. Usa la clave de demostración indicada.')
        }

        setPendingPhotos(demoPendingPhotos)
        setPublishedPhotos(demoPublishedPhotos)
        setIsAdminAuthenticated(true)
        setAdminPassword('')
        setAdminError('')
        return
      }

      const response = await fetch(`${apiUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo iniciar sesión.')
      }
      setAdminToken(data.token)

      setIsAdminAuthenticated(true)
      setAdminPassword('')
      setAdminError('')
      setView('admin')
      await loadPublishedPhotos()
    } catch (error) {
      setAdminError(error.message)
    }
  }

  async function updatePhotoStatus(id, status) {
    if (isStaticDemo) {
      const photo = [...pendingPhotos, ...publishedPhotos].find((item) => item.id === id)
      if (!photo) return

      setPendingPhotos((current) => current.filter((item) => item.id !== id))
      setPublishedPhotos((current) => current.filter((item) => item.id !== id))
      if (status === 'pending') {
        setPendingPhotos((current) => [{ ...photo, status }, ...current])
      } else if (status === 'published') {
        setPublishedPhotos((current) => [{ ...photo, status }, ...current])
      }
      return
    }

    const response = await fetch(`${apiUrl}/api/photos/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) {
      const data = await response.json()
      setAdminError(data.message || 'No se pudo actualizar la fotografía.')
      return
    }

    await loadPendingPhotos()
    await loadPublishedPhotos()
  }

  async function deletePhoto(id) {
    if (isStaticDemo) {
      setPendingPhotos((current) => current.filter((item) => item.id !== id))
      setPublishedPhotos((current) => current.filter((item) => item.id !== id))
      return
    }

    const response = await fetch(`${apiUrl}/api/photos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    if (!response.ok) {
      const data = await response.json()
      setAdminError(data.message || 'No se pudo eliminar la fotografía.')
      return
    }

    await loadPendingPhotos()
    await loadPublishedPhotos()
  }

  function openLightbox(index) {
    setLightboxIndex(index)
  }

  function closeLightbox() {
    setLightboxIndex(null)
  }

  function moveLightbox(direction) {
    if (lightboxIndex === null) {
      return
    }

    const nextIndex = Math.min(
      Math.max(lightboxIndex + direction, 0),
      publishedPhotos.length - 1
    )

    setLightboxIndex(nextIndex)
  }

  function handleTouchStart(event) {
    touchStartX.current = event.touches[0].clientX
  }

  function handleTouchEnd(event) {
    if (touchStartX.current === null) {
      return
    }

    const diff = touchStartX.current - event.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      moveLightbox(diff > 0 ? 1 : -1)
    }

    touchStartX.current = null
  }

  function scrollToGallery() {
    document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function copyEventLink() {
    navigator.clipboard?.writeText(shareUrl).catch((error) => {
      console.error('No se pudo copiar el enlace del evento', error)
      setStatusMessage('No se pudo copiar el enlace. Puedes copiarlo desde la barra del navegador.')
    })
  }

  function downloadQrCode() {
    const svg = document.querySelector('#event-qr, #admin-qr')
    if (!svg) return

    const serializer = new XMLSerializer()
    const source = serializer.serializeToString(svg)
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'qr-bautizo-matias.svg'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {view === 'home' && (
          <main className="screen home-screen">
            <section className="hero-panel">
              <div className="hero-copy">
                <p className="eyebrow">Bautizo de</p>
                <h1>MATÍAS</h1>
                <p className="date-line">7 de noviembre</p>
                <div className="heart-divider" aria-hidden="true"><span>†</span></div>
                <p className="welcome-text">
                  Gracias por acompañarnos
                  <span>en este día tan especial.</span>
                </p>

                <button type="button" className="primary-button hero-cta" onClick={() => setView('upload')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h3l1.4-2h7.2L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Compartir mis fotos</span>
                  <span className="button-chevron" aria-hidden="true">›</span>
                </button>

                {!isStaticDemo && publishedPhotos.length > 0 && (
                  <button type="button" className="secondary-link" onClick={scrollToGallery}>
                    <span aria-hidden="true">↓</span> Ver recuerdos
                  </button>
                )}
              </div>
            </section>

            <div className="qr-card" id="event-info">
              <div className="qr-code">
                <QRCode id="event-qr" value={shareUrl} size={100} bgColor="#ffffff" fgColor="#263b4d" />
              </div>
              <div className="qr-copy">
                <p className="qr-title">Código del evento</p>
                <p className="qr-subtitle">Escanéalo desde tu móvil para compartir tus fotos</p>
              </div>
              <button type="button" className="qr-share" onClick={copyEventLink} aria-label="Copiar enlace del evento">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="m8.7 10.6 6.6-4.2M8.7 13.4l6.6 4.2" />
                </svg>
                <span>Compartir<br />enlace</span>
              </button>
            </div>

            {!isStaticDemo && publishedPhotos.length > 0 ? (
              <section className="gallery-section" id="gallery">
                <div className="gallery-heading">
                  <div className="title-divider" aria-hidden="true" />
                  <h2>Recuerdos</h2>
                  <div className="title-divider" aria-hidden="true" />
                  <p>Un pequeño álbum de este gran día</p>
                </div>
                <div className="gallery-grid">
                  {publishedPhotos.map((photo, index) => (
                    <button
                      type="button"
                      key={photo.id}
                      className="photo-card"
                      onClick={() => openLightbox(index)}
                      aria-label="Abrir foto en pantalla completa"
                    >
                      <img src={photo.image_url} alt={photo.message || 'Foto del bautizo'} />
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <section className="review-notice" aria-live="polite">
                <span className="review-notice-mark" aria-hidden="true">✦</span>
                <h2>Fotografías en revisión</h2>
                <p>
                  {isStaticDemo
                    ? 'Cuando la familia revise y publique las fotografías, aparecerán aquí. Próximamente les haremos saber cuáles se publicaron.'
                    : 'La familia está revisando las fotografías. Próximamente les haremos saber cuáles se publicarán; entonces aparecerán aquí.'}
                </p>
                {isStaticDemo && (
                  <p className="review-notice-demo">
                    Esta demo todavía no está conectada al panel familiar.
                  </p>
                )}
              </section>
            )}

            <div className="home-status" aria-live="polite">
              {statusMessage && <p className="status-message">{statusMessage}</p>}
            </div>

            <footer className="site-footer">
              <button type="button" className="family-access" onClick={() => setView('admin')}>
                Acceso familiar
              </button>
            </footer>

          </main>
        )}

        {view === 'upload' && (
          <main className="screen upload-screen">
            <div className="panel-header">
              <button type="button" className="back-link" onClick={() => setView('home')}>
                ← Volver
              </button>
            </div>

            <div className="upload-panel">
              <h2>Selecciona tus fotos</h2>
              {isStaticDemo && (
                <p className="status-message">
                  Esta demo aún no está conectada al panel familiar: los envíos no llegan a la familia.
                </p>
              )}

              <p className="selection-count">Fotografías (obligatorio)</p>
              <input
                ref={fileInputRef}
                id="photo-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoPick}
                hidden
              />

              <label htmlFor="photo-upload" className="primary-button upload-button">
                + Seleccionar fotografías
              </label>

              {selectedFiles.length > 0 && (
                <div className="selected-grid">
                  {selectedFiles.map((file, index) => {
                    const previewUrl = URL.createObjectURL(file)

                    return (
                      <div className="selected-photo" key={`${file.name}-${index}`}>
                        <img
                          src={previewUrl}
                          alt={file.name}
                          onLoad={() => URL.revokeObjectURL(previewUrl)}
                        />
                        <button
                          type="button"
                          className="remove-photo"
                          onClick={() => handleRemoveSelected(index)}
                          aria-label={`Eliminar ${file.name}`}
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedFiles.length > 0 && (
                <p className="selection-count">{selectedFiles.length} fotos seleccionadas</p>
              )}

              <div className="field-group">
                <label htmlFor="guestName">Nombre (opcional)</label>
                <input
                  id="guestName"
                  type="text"
                  placeholder="Ej. María"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                />
              </div>

              <div className="field-group">
                <label htmlFor="message">Mensaje (opcional)</label>
                <textarea
                  id="message"
                  rows="4"
                  placeholder="Escribe una felicitación para Matías ❤️"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="primary-button submit-button"
                onClick={handleSubmitPhotos}
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading ? 'Subiendo tus fotos...' : '❤️ Compartir recuerdos'}
              </button>

              {uploading && (
                <div className="progress-box" aria-live="polite">
                  <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              {statusMessage && <p className="status-message">{statusMessage}</p>}
            </div>
          </main>
        )}

        {view === 'confirm' && (
          <main className="screen confirm-screen">
            <div className="confirmation-panel">
              <div className="heart">❤️</div>
              <h2>¡Gracias!</h2>
              <p>
              {isStaticDemo
                ? 'En esta demo no se enviaron a la familia; al conectar el servidor, las fotografías quedarán en revisión.'
                : 'Tus fotografías quedaron en revisión por la familia. Próximamente les haremos saber cuáles se publicarán.'}
              </p>
              <p>
              El nombre y el mensaje solo aparecerán si la familia publica la fotografía.
              </p>
              <button type="button" className="primary-button" onClick={() => setView('home')}>
                Ver álbum
              </button>
            </div>
          </main>
        )}

        {view === 'admin' && (
          <main className="screen admin-screen">
            <div className="panel-header admin-header">
              <button type="button" className="back-link" onClick={() => setView('home')}>
                ← Volver
              </button>
            </div>

            {!isAdminAuthenticated ? (
              <form className="admin-login" onSubmit={handleAdminLogin}>
                <h2>Administrador</h2>
                {isStaticDemo && (
                  <div className="demo-notice">
                    <strong>Vista previa del panel</strong>
                    <span>Contraseña de demostración: <code>matias2026</code></span>
                    <span>Incluye fotos de ejemplo. No guarda cambios ni afecta el álbum público.</span>
                  </div>
                )}
                <label htmlFor="adminPassword">Contraseña</label>
                <input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  placeholder="••••••••"
                />
                {adminError && <p className="status-message error-message">{adminError}</p>}
                <button type="submit" className="primary-button">
                  Iniciar sesión
                </button>
              </form>
            ) : (
              <section className="admin-panel">
                <h2>Fotos pendientes</h2>
                {isStaticDemo && (
                  <div className="demo-notice">
                    Modo demostración: estas fotos y acciones son de ejemplo y solo duran en esta sesión.
                  </div>
                )}
                {adminError && <p className="status-message error-message">{adminError}</p>}
                {pendingPhotos.length ? (
                  pendingPhotos.map((photo) => (
                    <article key={photo.id} className="admin-photo-item">
                      <img src={photo.image_url} alt={photo.message || 'Foto pendiente'} />
                      <div className="admin-photo-copy">
                        <strong>{photo.guest_name || 'Invitado'}</strong>
                        <p>{photo.message || 'Sin mensaje'}</p>
                      </div>
                      <div className="admin-actions">
                        <button type="button" onClick={() => updatePhotoStatus(photo.id, 'published')}>
                          Publicar
                        </button>
                        <button type="button" className="danger" onClick={() => updatePhotoStatus(photo.id, 'rejected')}>
                          Rechazar
                        </button>
                        <button type="button" className="danger" onClick={() => deletePhoto(photo.id)}>
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">No hay fotos pendientes.</p>
                )}

                <div className="admin-published">
                  <h2>Fotos publicadas</h2>
                  {publishedPhotos.length ? (
                    publishedPhotos.map((photo) => (
                      <article key={photo.id} className="admin-photo-item">
                        <img src={photo.image_url} alt={photo.message || 'Foto publicada'} />
                        <div className="admin-photo-copy">
                          <strong>{photo.guest_name || 'Invitado'}</strong>
                          <p>{photo.message || 'Sin mensaje'}</p>
                        </div>
                        <div className="admin-actions">
                          <button type="button" onClick={() => updatePhotoStatus(photo.id, 'pending')}>
                            Retirar de publicaciones
                          </button>
                          <button type="button" className="danger" onClick={() => deletePhoto(photo.id)}>
                            Eliminar
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="empty-state">Aún no hay fotos publicadas.</p>
                  )}
                </div>

                <div className="qr-card admin-qr">
                  <div>
                    <p className="qr-title">QR del evento</p>
                    <p className="qr-subtitle">/bautizo/matias</p>
                  </div>
                  <QRCode id="admin-qr" value={shareUrl} size={88} bgColor="#ffffff" fgColor="#1b2b3d" />
                </div>
                <div className="admin-qr-actions">
                  <button type="button" className="secondary-action" onClick={copyEventLink}>
                    Copiar enlace
                  </button>
                  <button type="button" className="secondary-action" onClick={downloadQrCode}>
                    Descargar QR
                  </button>
                </div>
              </section>
            )}
          </main>
        )}
      </div>

      {lightboxIndex !== null && publishedPhotos[lightboxIndex] && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div
            className="lightbox"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button type="button" className="lightbox-close" onClick={closeLightbox}>
              ×
            </button>

            <button
              type="button"
              className="nav-button prev"
              onClick={() => moveLightbox(-1)}
              aria-label="Anterior"
            >
              ‹
            </button>

            <img src={publishedPhotos[lightboxIndex].image_url} alt="Foto ampliada" />

            <button
              type="button"
              className="nav-button next"
              onClick={() => moveLightbox(1)}
              aria-label="Siguiente"
            >
              ›
            </button>

            <div className="lightbox-meta">
              <strong>{publishedPhotos[lightboxIndex].guest_name || 'Invitado'}</strong>
              <p>{publishedPhotos[lightboxIndex].message || 'Recuerdo del bautizo'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
