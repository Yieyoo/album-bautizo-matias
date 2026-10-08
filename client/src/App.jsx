import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
    submission_id: 'demo-submission-mariana',
    guest_name: 'Mariana López',
    message: 'Un día muy especial para toda la familia. ¡Te queremos, Matías!',
    image_url: 'https://images.unsplash.com/photo-1731743214989-9b4d60937ddf?auto=format&fit=crop&w=900&q=80',
    status: 'pending',
  },
  {
    id: 'demo-pending-2',
    submission_id: 'demo-submission-mariana',
    guest_name: 'Mariana López',
    message: 'Un día muy especial para toda la familia. ¡Te queremos, Matías!',
    image_url: 'https://images.unsplash.com/photo-1787214091915-994e9806ff9d?auto=format&fit=crop&w=900&q=80',
    status: 'pending',
  },
  {
    id: 'demo-pending-3',
    submission_id: 'demo-submission-mariana',
    guest_name: 'Mariana López',
    message: 'Un día muy especial para toda la familia. ¡Te queremos, Matías!',
    image_url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80',
    status: 'pending',
  },
  {
    id: 'demo-pending-4',
    submission_id: 'demo-submission-mariana',
    guest_name: 'Mariana López',
    message: 'Un día muy especial para toda la familia. ¡Te queremos, Matías!',
    image_url: 'https://images.unsplash.com/photo-1566516171511-1c411a59c8ba?auto=format&fit=crop&w=900&q=80',
    status: 'pending',
  },
  {
    id: 'demo-pending-5',
    submission_id: 'demo-submission-mariana',
    guest_name: 'Mariana López',
    message: 'Un día muy especial para toda la familia. ¡Te queremos, Matías!',
    image_url: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=800&q=80',
    status: 'pending',
  },
  {
    id: 'demo-pending-6',
    submission_id: 'demo-submission-mariana',
    guest_name: 'Mariana López',
    message: 'Un día muy especial para toda la familia. ¡Te queremos, Matías!',
    image_url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
    status: 'pending',
  },
]

const demoPublishedPhotos = [
  {
    id: 'demo-published-1',
    submission_id: 'demo-submission-carlos',
    guest_name: 'Familia García',
    message: 'Celebrando juntos este hermoso día.',
    image_url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80',
    status: 'published',
  },
  {
    id: 'demo-published-2',
    submission_id: 'demo-submission-carlos',
    guest_name: 'Familia García',
    message: 'Celebrando juntos este hermoso día.',
    image_url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
    status: 'published',
  },
]

function groupPhotosBySubmission(photos) {
  const groups = new Map()

  photos.forEach((photo) => {
    const submissionId = photo.submission_id || photo.id
    if (!groups.has(submissionId)) {
      groups.set(submissionId, {
        id: submissionId,
        guest_name: photo.guest_name,
        message: photo.message,
        photos: [],
      })
    }
    groups.get(submissionId).photos.push(photo)
  })

  return Array.from(groups.values())
}

function App() {
  const [publishedPhotos, setPublishedPhotos] = useState([])
  const [pendingPhotos, setPendingPhotos] = useState([])
  const [archivedPhotos, setArchivedPhotos] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [guestName, setGuestName] = useState('')
  const [message, setMessage] = useState('')
  const [view, setView] = useState(
    new URLSearchParams(window.location.search).has('admin') ? 'admin' : 'home'
  )
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [lightboxPhotos, setLightboxPhotos] = useState([])
  const [lightboxAllowsDownload, setLightboxAllowsDownload] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const preparedPhotoFiles = useRef(new Map())
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminNotice, setAdminNotice] = useState('')
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([])
  const [deletingPhotoIds, setDeletingPhotoIds] = useState([])
  const [savingSubmissionId, setSavingSubmissionId] = useState(null)
  const [submissionSaveErrors, setSubmissionSaveErrors] = useState({})
  const fileInputRef = useRef(null)
  const touchStartX = useRef(null)
  const adminScreenRef = useRef(null)
  const adminPasswordRef = useRef(null)

  useEffect(() => {
    loadPublishedPhotos()
  }, [])

  useLayoutEffect(() => {
    if (view !== 'admin') return

    window.scrollTo({ top: 0, behavior: 'auto' })
    adminScreenRef.current?.scrollIntoView({ block: 'start' })
    if (!isAdminAuthenticated) {
      window.setTimeout(() => adminPasswordRef.current?.focus({ preventScroll: true }), 250)
    }
  }, [view, isAdminAuthenticated])

  useEffect(() => {
    if (view === 'admin' && isAdminAuthenticated) {
      loadPendingPhotos()
      loadArchivedPhotos()
    }
  }, [view, isAdminAuthenticated, adminToken])

  useEffect(() => {
    if (lightboxIndex === null) return undefined

    function handleLightboxKeyDown(event) {
      if (event.key === 'Escape') closeLightbox()
      if (event.key === 'ArrowLeft') moveLightbox(-1)
      if (event.key === 'ArrowRight') moveLightbox(1)
    }

    window.addEventListener('keydown', handleLightboxKeyDown)
    return () => window.removeEventListener('keydown', handleLightboxKeyDown)
  }, [lightboxIndex, lightboxPhotos])

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
      setStatusMessage('El envío de fotografías no está disponible ahora; tus fotos no se enviaron.')
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
          throw new Error('Contraseña incorrecta. Intenta de nuevo.')
        }

        setPendingPhotos(demoPendingPhotos)
        setPublishedPhotos(demoPublishedPhotos)
        setArchivedPhotos([])
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

  async function updatePhotoStatus(id, status, refresh = true) {
    if (isStaticDemo) {
      const photo = [...pendingPhotos, ...publishedPhotos, ...archivedPhotos].find((item) => item.id === id)
      if (!photo) return false

      setPendingPhotos((current) => current.filter((item) => item.id !== id))
      setPublishedPhotos((current) => current.filter((item) => item.id !== id))
      setArchivedPhotos((current) => current.filter((item) => item.id !== id))
      if (status === 'pending') {
        setPendingPhotos((current) => [{ ...photo, status }, ...current])
      } else if (status === 'published') {
        setPublishedPhotos((current) => [{ ...photo, status }, ...current])
      } else if (status === 'archived') {
        setArchivedPhotos((current) => [{ ...photo, status }, ...current])
      }
      setSelectedPhotoIds((current) => current.filter((photoId) => photoId !== id))
      return true
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
      return false
    }

    setSelectedPhotoIds((current) => current.filter((photoId) => photoId !== id))
    if (refresh) {
      await loadPendingPhotos()
      await loadPublishedPhotos()
      await loadArchivedPhotos()
    }
    return true
  }

  function togglePhotoSelection(photoId) {
    setSelectedPhotoIds((current) => (
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : [...current, photoId]
    ))
  }

  function toggleSubmissionSelection(photos) {
    const photoIds = photos.map((photo) => photo.id)
    const allSelected = photoIds.every((id) => selectedPhotoIds.includes(id))
    setSelectedPhotoIds((current) => (
      allSelected
        ? current.filter((id) => !photoIds.includes(id))
        : [...new Set([...current, ...photoIds])]
    ))
  }

  async function moderateSelectedPhotos(photos, status) {
    const selected = photos.filter((photo) => selectedPhotoIds.includes(photo.id))
    if (!selected.length) return

    setAdminError('')
    const results = await Promise.all(
      selected.map((photo) => updatePhotoStatus(photo.id, status, false))
    )

    if (results.some(Boolean) && !isStaticDemo) {
      await loadPendingPhotos()
      await loadPublishedPhotos()
      await loadArchivedPhotos()
    }
  }

  async function deletePhoto(id, confirmDeletion = true) {
    if (
      confirmDeletion &&
      !window.confirm('¿Eliminar esta foto definitivamente? Esta acción no se puede deshacer.')
    ) {
      return false
    }

    setAdminError('')
    setAdminNotice('')
    setDeletingPhotoIds((current) => [...current, id])

    try {
      let warning = ''
      if (isStaticDemo) {
        setPendingPhotos((current) => current.filter((photo) => photo.id !== id))
        setPublishedPhotos((current) => current.filter((photo) => photo.id !== id))
        setArchivedPhotos((current) => current.filter((photo) => photo.id !== id))
      } else {
        const response = await fetch(`${apiUrl}/api/photos/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + adminToken },
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'No se pudo eliminar la foto.')
        }
        warning = data.warning || ''
        setPendingPhotos((current) => current.filter((photo) => photo.id !== id))
        setPublishedPhotos((current) => current.filter((photo) => photo.id !== id))
        setArchivedPhotos((current) => current.filter((photo) => photo.id !== id))
      }

      setSelectedPhotoIds((current) => current.filter((photoId) => photoId !== id))
      if (warning) setAdminNotice(warning)
      return true
    } catch (error) {
      console.error('Error deleting photo', error)
      setAdminError(error.message || 'No se pudo eliminar la foto.')
      return false
    } finally {
      setDeletingPhotoIds((current) => current.filter((photoId) => photoId !== id))
    }
  }

  async function deleteSelectedPhotos(photos) {
    const selected = photos.filter((photo) => selectedPhotoIds.includes(photo.id))
    if (!selected.length) return

    const confirmation = selected.length === 1
      ? '¿Eliminar definitivamente la foto seleccionada? Esta acción no se puede deshacer.'
      : `¿Eliminar definitivamente las ${selected.length} fotos seleccionadas? Esta acción no se puede deshacer.`
    if (!window.confirm(confirmation)) return

    const results = await Promise.all(
      selected.map((photo) => deletePhoto(photo.id, false))
    )
    const failedCount = results.filter((result) => !result).length
    if (failedCount) {
      setAdminNotice(`${selected.length - failedCount} foto(s) eliminada(s); ${failedCount} no se pudieron eliminar.`)
    }
  }

  async function loadArchivedPhotos() {
    if (isStaticDemo) return

    try {
      const response = await fetch(`${apiUrl}/api/photos?status=archived`, {
        headers: { Authorization: 'Bearer ' + adminToken },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar las fotos archivadas.')
      }
      setArchivedPhotos(data.photos ?? [])
    } catch (error) {
      console.error('Error loading archived photos', error)
      setAdminError(error.message)
    }
  }

  function renderPhotoSubmissions(photos, isPublished = false, isArchived = false) {
    return groupPhotosBySubmission(photos).map((submission) => (
      <article key={submission.id} className="admin-submission">
        <header className="admin-submission-header">
          <div className="admin-photo-copy">
            <strong>{submission.guest_name || 'Invitado'}</strong>
            <p>{submission.message || 'Sin mensaje'}</p>
          </div>
          <div className="submission-tools">
            <span className="submission-count">
              {submission.photos.length} {submission.photos.length === 1 ? 'foto' : 'fotos'}
            </span>
            <button
              type="button"
              className="save-submission-button"
              onClick={() => saveSubmissionPhotos(submission)}
              disabled={savingSubmissionId !== null}
            >
              {savingSubmissionId === submission.id ? 'Preparando fotos…' : 'Guardar bloque en Fotos'}
            </button>
            {!isPublished && !isArchived && (
              <label className="select-all-photos">
                <input
                  type="checkbox"
                  checked={submission.photos.every((photo) => selectedPhotoIds.includes(photo.id))}
                  onChange={() => toggleSubmissionSelection(submission.photos)}
                  aria-label={`Seleccionar todas las fotos de ${submission.guest_name || 'invitado'}`}
                />
                Todas
              </label>
            )}
          </div>
        </header>
        {submissionSaveErrors[submission.id] && (
          <p className="submission-save-error" role="alert">{submissionSaveErrors[submission.id]}</p>
        )}
        <div className="admin-submission-grid">
          {submission.photos.map((photo, index) => (
            <article key={photo.id} className="admin-submission-photo">
              {!isPublished && !isArchived && (
                <label className="photo-select">
                  <input
                    type="checkbox"
                    checked={selectedPhotoIds.includes(photo.id)}
                    onChange={() => togglePhotoSelection(photo.id)}
                    aria-label={`Seleccionar foto ${index + 1} de ${submission.guest_name || 'invitado'}`}
                  />
                  <span>Elegir</span>
                </label>
              )}
              <button
                type="button"
                className="admin-photo-preview"
                onClick={() => openLightbox(index, submission.photos, true)}
                aria-label={`Ampliar foto ${index + 1} de ${submission.guest_name || 'invitado'}`}
              >
                <img src={photo.image_url} alt="" />
              </button>
              <div className="admin-submission-actions">
                {isPublished ? (
                  <>
                    <button type="button" onClick={() => updatePhotoStatus(photo.id, 'pending')}>
                      Retirar
                    </button>
                    <button type="button" onClick={() => updatePhotoStatus(photo.id, 'archived')}>
                      Archivar
                    </button>
                  </>
                ) : isArchived ? (
                  <button type="button" onClick={() => updatePhotoStatus(photo.id, 'pending')}>
                    Restaurar
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => updatePhotoStatus(photo.id, 'published')}>
                      Publicar
                    </button>
                    <button type="button" onClick={() => updatePhotoStatus(photo.id, 'archived')}>
                      Archivar
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="danger"
                  onClick={() => deletePhoto(photo.id)}
                  disabled={deletingPhotoIds.includes(photo.id)}
                >
                  {deletingPhotoIds.includes(photo.id) ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            </article>
          ))}
        </div>
        {!isPublished && !isArchived && selectedPhotoIds.some((id) => submission.photos.some((photo) => photo.id === id)) && (
          <div className="submission-bulk-actions">
            <span>
              {submission.photos.filter((photo) => selectedPhotoIds.includes(photo.id)).length} seleccionadas
            </span>
            <button type="button" onClick={() => moderateSelectedPhotos(submission.photos, 'published')}>
              Publicar seleccionadas
            </button>
            <button type="button" onClick={() => moderateSelectedPhotos(submission.photos, 'archived')}>
              Archivar seleccionadas
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => deleteSelectedPhotos(submission.photos)}
              disabled={submission.photos.some((photo) => deletingPhotoIds.includes(photo.id))}
            >
              Eliminar seleccionadas
            </button>
          </div>
        )}
      </article>
    ))
  }

  function openLightbox(index, photos = publishedPhotos, allowDownload = true) {
    setLightboxPhotos(photos)
    setLightboxAllowsDownload(allowDownload && isAdminAuthenticated)
    setDownloadError('')
    setLightboxIndex(index)
  }

  function closeLightbox() {
    setLightboxIndex(null)
    setLightboxPhotos([])
    setLightboxAllowsDownload(false)
    setDownloadError('')
  }

  // Las fotos descargadas se guardan para que un segundo toque pueda abrir
  // el menú de compartir al instante, cuando el primero tardó demasiado
  // y el navegador ya no lo considera una acción del usuario.
  async function getPhotoFile(photo, index) {
    const cachedFile = preparedPhotoFiles.current.get(photo.id)
    if (cachedFile) return cachedFile

    const response = await fetch(
      isStaticDemo
        ? photo.image_url
        : `${apiUrl}/api/photos/${encodeURIComponent(photo.id)}/download`,
      isStaticDemo ? undefined : { headers: { Authorization: `Bearer ${adminToken}` } }
    )
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'No se pudo descargar la foto.')
    }

    const image = await response.blob()
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const extension = extensions[image.type.toLowerCase()]
    if (!extension) throw new Error('Una de las fotos tiene un formato no compatible.')

    const file = new File([image], `foto-matias-${index + 1}.${extension}`, { type: image.type })
    preparedPhotoFiles.current.set(photo.id, file)
    return file
  }

  async function sharePhotoFiles(files) {
    // Sin title ni text: si se comparten junto a las imágenes, iOS oculta
    // "Guardar imagen" y solo ofrece "Guardar en Archivos".
    try {
      await navigator.share({ files })
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Las fotos ya están listas. Toca el botón otra vez y elige "Guardar imagen".')
      }
      throw error
    }
  }

  async function saveSubmissionPhotos(submission) {
    if (!isAdminAuthenticated || savingSubmissionId !== null) return

    setSavingSubmissionId(submission.id)
    setSubmissionSaveErrors((current) => ({ ...current, [submission.id]: '' }))

    try {
      const files = await Promise.all(submission.photos.map(getPhotoFile))

      if (!navigator.share || !navigator.canShare?.({ files })) {
        throw new Error('Este navegador no permite guardar el bloque completo. Ábrelo en Safari para compartir todas las fotos con Fotos.')
      }

      await sharePhotoFiles(files)
    } catch (error) {
      if (error.name === 'AbortError') return
      console.error('Error saving photo submission', error)
      setSubmissionSaveErrors((current) => ({
        ...current,
        [submission.id]: error.message || 'No se pudieron guardar las fotos.',
      }))
    } finally {
      setSavingSubmissionId(null)
    }
  }

  async function downloadLightboxPhoto() {
    const photo = lightboxPhotos[lightboxIndex]
    if (!photo || !lightboxAllowsDownload) return

    setDownloadError('')
    try {
      const imageFile = await getPhotoFile(photo, lightboxIndex)

      if (navigator.canShare?.({ files: [imageFile] }) && navigator.share) {
        await sharePhotoFiles([imageFile])
      } else {
        const imageUrl = URL.createObjectURL(imageFile)
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = imageFile.name
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(imageUrl), 1000)
      }
    } catch (error) {
      if (error.name === 'AbortError') return
      console.error('Error downloading photo', error)
      setDownloadError(error.message || 'No se pudo descargar la foto.')
    }
  }

  function moveLightbox(direction) {
    if (lightboxIndex === null) {
      return
    }

    const nextIndex = Math.min(
      Math.max(lightboxIndex + direction, 0),
      lightboxPhotos.length - 1
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
                  La familia revisará las fotografías. Las que decida publicar aparecerán aquí.
                </p>
              </section>
            )}

            <div className="home-status" aria-live="polite">
              {statusMessage && <p className="status-message">{statusMessage}</p>}
            </div>

            <footer className="site-footer">
              <button
                type="button"
                className="family-access"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'auto' })
                  setView('admin')
                }}
              >
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
                  El envío de fotografías todavía no está disponible; las fotos no se enviarán a la familia.
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
                ? 'Las fotografías no se enviaron porque el servicio de carga todavía no está disponible.'
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
          <main className="screen admin-screen" ref={adminScreenRef}>
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
                  ref={adminPasswordRef}
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
                {adminError && <p className="status-message error-message">{adminError}</p>}
                {adminNotice && <p className="status-message" role="status">{adminNotice}</p>}
                {pendingPhotos.length ? (
                  renderPhotoSubmissions(pendingPhotos)
                ) : (
                  <p className="empty-state">No hay fotos pendientes.</p>
                )}

                <div className="admin-published">
                  <h2>Fotos publicadas</h2>
                  {publishedPhotos.length ? (
                    renderPhotoSubmissions(publishedPhotos, true)
                  ) : (
                    <p className="empty-state">Aún no hay fotos publicadas.</p>
                  )}
                </div>

                <div className="admin-archived">
                  <h2>Fotos archivadas</h2>
                  {archivedPhotos.length ? (
                    renderPhotoSubmissions(archivedPhotos, false, true)
                  ) : (
                    <p className="empty-state">No hay fotos archivadas.</p>
                  )}
                </div>
              </section>
            )}
          </main>
        )}
      </div>

      {lightboxIndex !== null && lightboxPhotos[lightboxIndex] && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div
            className="lightbox"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="dialog"
            aria-modal="true"
            aria-label="Foto ampliada"
          >
            <button type="button" className="lightbox-close" onClick={closeLightbox} aria-label="Cerrar foto ampliada">
              ×
            </button>

            {lightboxPhotos.length > 1 && (
              <button
                type="button"
                className="nav-button prev"
                onClick={() => moveLightbox(-1)}
                aria-label="Anterior"
              >
                ‹
              </button>
            )}

            <img src={lightboxPhotos[lightboxIndex].image_url} alt="Foto ampliada" />

            {lightboxPhotos.length > 1 && (
              <button
                type="button"
                className="nav-button next"
                onClick={() => moveLightbox(1)}
                aria-label="Siguiente"
              >
                ›
              </button>
            )}

            <div className="lightbox-meta">
              <strong>{lightboxPhotos[lightboxIndex].guest_name || 'Invitado'}</strong>
              <p>{lightboxPhotos[lightboxIndex].message || 'Recuerdo del bautizo'}</p>
              {lightboxAllowsDownload && (
                <>
                  <button type="button" className="lightbox-download" onClick={downloadLightboxPhoto}>
                    Guardar foto
                  </button>
                  {downloadError && <p className="download-error" role="alert">{downloadError}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
