import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import './App.css'

const validImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const shareUrl = 'https://example.com/bautizo/matias'

const fallbackPhotos = [
  {
    id: 'seed-1',
    guest_name: 'Mamá',
    message: 'Muchas felicidades Matías ❤️',
    image_url:
      'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'seed-2',
    guest_name: 'Tío José',
    message: 'Qué alegría compartir este día contigo.',
    image_url:
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'seed-3',
    guest_name: 'Abuela',
    message: 'Te queremos muchísimo, Matías.',
    image_url:
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'seed-4',
    guest_name: 'Familia',
    message: 'Gracias por este recuerdo tan especial.',
    image_url:
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
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

      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron guardar las fotos.')
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
    await fetch(`/api/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })

    await loadPendingPhotos()
    await loadApprovedPhotos()
  }

  async function deletePhoto(id) {
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
    navigator.clipboard?.writeText(shareUrl)
  }

  function downloadQrCode() {
    const svg = document.getElementById('event-qr')
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
            <div className="topbar">
              <button type="button" className="link-button" onClick={() => setView('admin')}>
                Admin
              </button>
            </div>

            <section className="hero-panel">
              <div className="cross-mark">✝</div>
              <p className="eyebrow">Bautizo de</p>
              <h1>MATÍAS</h1>
              <p className="date-line">7 de noviembre</p>
              <p className="welcome-text">
                Gracias por acompañarnos
                <span>en este día tan especial.</span>
              </p>

              <button type="button" className="primary-button" onClick={() => setView('upload')}>
                📸 Subir fotos
              </button>

              <button type="button" className="secondary-link" onClick={scrollToGallery}>
                ↓ Ver recuerdos
              </button>
            </section>

            <div className="qr-card">
              <div>
                <p className="qr-title">Código del evento</p>
                <p className="qr-subtitle">Escanéalo desde tu móvil</p>
              </div>
              <QRCode id="event-qr" value={shareUrl} size={92} bgColor="#ffffff" fgColor="#1b2b3d" />
            </div>

            <section className="gallery-section" id="gallery">
              <div className="section-head">
                <h2>Recuerdos</h2>
                <button type="button" className="share-button" onClick={() => setView('upload')}>
                  📸 Compartir mis fotos
                </button>
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
