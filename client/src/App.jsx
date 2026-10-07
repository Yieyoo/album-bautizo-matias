import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import './App.css'

const validImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const isStaticDemo = import.meta.env.PROD
const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}`

const fallbackPhotos = [
  {
    id: 'seed-1',
    guest_name: 'Mamá',
    message: 'Muchas felicidades Matías ❤️',
    image_url:
      'https://images.unsplash.com/photo-1731743214989-9b4d60937ddf?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'seed-2',
    guest_name: 'Familia',
    message: 'Un recuerdo muy especial de este día.',
    image_url:
      'https://images.unsplash.com/photo-1787214091915-994e9806ff9d?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'seed-3',
    guest_name: 'Con cariño',
    message: 'Celebrando juntos a Matías.',
    image_url:
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80',
  },
]

function App() {
  const [approvedPhotos, setApprovedPhotos] = useState(fallbackPhotos)
  const [pendingPhotos, setPendingPhotos] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [guestName, setGuestName] = useState('')
  const [message, setMessage] = useState('')
  const [view, setView] = useState('home')
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [showFloatingUpload, setShowFloatingUpload] = useState(false)
  const fileInputRef = useRef(null)
  const touchStartX = useRef(null)

  useEffect(() => {
    loadApprovedPhotos()
  }, [])

  useEffect(() => {
    if (view === 'admin' && isAdminAuthenticated) {
      loadPendingPhotos()
    }
  }, [view, isAdminAuthenticated])

  useEffect(() => {
    if (view !== 'home') {
      setShowFloatingUpload(false)
      return undefined
    }

    const hero = document.querySelector('.hero-panel')
    if (!hero) {
      return undefined
    }

    const observer = new IntersectionObserver(([entry]) => {
      setShowFloatingUpload(!entry.isIntersecting)
    })
    observer.observe(hero)

    return () => observer.disconnect()
  }, [view])

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

  async function loadApprovedPhotos() {
    if (isStaticDemo) {
      return
    }

    try {
      const response = await fetch('/api/photos?status=approved')
      const data = await response.json()
      if (data.photos && data.photos.length) {
        setApprovedPhotos(data.photos)
      }
    } catch (error) {
      console.error('Error loading approved photos', error)
    }
  }

  async function loadPendingPhotos() {
    if (isStaticDemo) {
      return
    }

    try {
      const response = await fetch('/api/photos?status=pending')
      const data = await response.json()
      setPendingPhotos(data.photos ?? [])
    } catch (error) {
      console.error('Error loading pending photos', error)
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

    const formData = new FormData()
    selectedFiles.forEach((file) => formData.append('photos', file))
    formData.append('guestName', guestName)
    formData.append('message', message)

    try {
      setUploading(true)
      setUploadProgress(10)
      setStatusMessage('Subiendo tus fotos...')

      let data
      if (isStaticDemo) {
        const demoPhotos = selectedFiles.map((file) => ({
          id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          guest_name: guestName,
          message,
          image_url: URL.createObjectURL(file),
        }))

        setPendingPhotos((current) => [...demoPhotos, ...current])
        data = { message: 'Fotos añadidas a esta demo en este navegador.' }
      } else {
        const response = await fetch('/api/photos', {
          method: 'POST',
          body: formData,
        })

        data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'No se pudieron guardar las fotos.')
        }
      }

      setUploadProgress(100)
      setSelectedFiles([])
      setGuestName('')
      setMessage('')
      setTimeout(() => {
        setView('confirm')
        setUploading(false)
        setStatusMessage(data.message || 'Gracias por compartir tus recuerdos.')
      }, 400)
    } catch (error) {
      setStatusMessage(error.message)
      setUploading(false)
    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault()

    if (adminPassword === 'matias2024') {
      setIsAdminAuthenticated(true)
      setAdminPassword('')
      setAdminError('')
      setView('admin')
      await loadPendingPhotos()
      return
    }

    setAdminError('Contraseña incorrecta. Intenta de nuevo.')
  }

  async function approvePhoto(id) {
    if (isStaticDemo) {
      const photo = pendingPhotos.find((item) => item.id === id)
      if (photo) {
        setPendingPhotos((current) => current.filter((item) => item.id !== id))
        setApprovedPhotos((current) => [...current, photo])
      }
      return
    }

    await fetch(`/api/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })

    await loadPendingPhotos()
    await loadApprovedPhotos()
  }

  async function deletePhoto(id) {
    if (isStaticDemo) {
      const photo = pendingPhotos.find((item) => item.id === id)
      if (photo?.image_url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.image_url)
      }
      setPendingPhotos((current) => current.filter((item) => item.id !== id))
      setApprovedPhotos((current) => current.filter((item) => item.id !== id))
      return
    }

    await fetch(`/api/photos/${id}`, {
      method: 'DELETE',
    })

    await loadPendingPhotos()
    await loadApprovedPhotos()
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
      approvedPhotos.length - 1
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

                <button type="button" className="secondary-link" onClick={scrollToGallery}>
                  <span aria-hidden="true">↓</span> Ver recuerdos
                </button>
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

            <section className="gallery-section" id="gallery">
              <div className="gallery-heading">
                <div className="title-divider" aria-hidden="true" />
                <h2>Recuerdos</h2>
                <div className="title-divider" aria-hidden="true" />
                <p>Un pequeño álbum de este gran día</p>
              </div>

              {approvedPhotos.length ? (
                <div className="gallery-grid">
                  {approvedPhotos.map((photo, index) => (
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
              ) : (
                <p className="empty-state">Aún no hay recuerdos compartidos.</p>
              )}
            </section>

            <div className="home-status" aria-live="polite">
              {statusMessage && <p className="status-message">{statusMessage}</p>}
            </div>

            {showFloatingUpload && (
              <div className="floating-upload">
                <button type="button" className="floating-upload-button" onClick={() => setView('upload')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h3l1.4-2h7.2L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Subir fotos
                </button>
              </div>
            )}

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
                  Demo: las fotos se muestran solo en este navegador y no se guardan en línea.
                </p>
              )}

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
                + Seleccionar fotos
              </label>

              {selectedFiles.length > 0 && (
                <>
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

                  <p className="selection-count">{selectedFiles.length} fotos seleccionadas</p>

                  <div className="field-group">
                    <label htmlFor="guestName">Tu nombre</label>
                    <input
                      id="guestName"
                      type="text"
                      placeholder="Ej. María"
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                    />
                  </div>

                  <div className="field-group">
                    <label htmlFor="message">Mensaje</label>
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
                    disabled={uploading}
                  >
                    {uploading ? 'Subiendo tus fotos...' : '❤️ Compartir recuerdos'}
                  </button>

                  {uploading && (
                    <div className="progress-box" aria-live="polite">
                      <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </>
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
                Tus fotografías fueron <span>recibidas correctamente.</span>
              </p>
              <p>
                Ayudaste a guardar un <span>recuerdo de este día.</span>
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
                {pendingPhotos.length ? (
                  pendingPhotos.map((photo) => (
                    <article key={photo.id} className="admin-photo-item">
                      <img src={photo.image_url} alt={photo.message || 'Foto pendiente'} />
                      <div className="admin-photo-copy">
                        <strong>{photo.guest_name || 'Invitado'}</strong>
                        <p>{photo.message || 'Sin mensaje'}</p>
                      </div>
                      <div className="admin-actions">
                        <button type="button" onClick={() => approvePhoto(photo.id)}>
                          Aprobar
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

      {lightboxIndex !== null && approvedPhotos[lightboxIndex] && (
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

            <img src={approvedPhotos[lightboxIndex].image_url} alt="Foto ampliada" />

            <button
              type="button"
              className="nav-button next"
              onClick={() => moveLightbox(1)}
              aria-label="Siguiente"
            >
              ›
            </button>

            <div className="lightbox-meta">
              <strong>{approvedPhotos[lightboxIndex].guest_name || 'Invitado'}</strong>
              <p>{approvedPhotos[lightboxIndex].message || 'Recuerdo del bautizo'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
