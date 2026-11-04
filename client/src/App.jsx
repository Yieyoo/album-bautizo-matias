import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { prepareImageForUpload } from './prepareImage.js'
import { familyMessage, familyPhotos, splitIntoColumns } from './familyAlbum.js'

const validImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const isStaticDemo = import.meta.env.PROD && !apiUrl
const demoAdminPassword = 'matias2026'

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

const adminTokenStorageKey = 'album-matias-admin-token'

// La sesión se conserva al recargar la página mientras no caduque
function readStoredAdminToken() {
  try {
    const token = window.sessionStorage.getItem(adminTokenStorageKey) ?? ''
    return Number(token.split('.')[0]) > Date.now() ? token : ''
  } catch {
    return ''
  }
}

function storeAdminToken(token) {
  try {
    if (token) window.sessionStorage.setItem(adminTokenStorageKey, token)
    else window.sessionStorage.removeItem(adminTokenStorageKey)
  } catch {
    // Sin almacenamiento (modo privado) la sesión dura hasta recargar
  }
}

// Cloudinary genera versiones reducidas al vuelo; el original queda intacto
// para guardarlo. Otras URLs (fotos de demostración) se usan tal cual.
function cloudinaryImageUrl(url, width) {
  if (!url?.includes('res.cloudinary.com/') || !url.includes('/image/upload/')) return url
  return url.replace('/image/upload/', `/image/upload/c_limit,w_${width},q_auto,f_auto/`)
}

function thumbnailUrl(url) {
  return cloudinaryImageUrl(url, 600)
}

function displayUrl(url) {
  return cloudinaryImageUrl(url, 1600)
}

// Si el archivo ya no existe en Cloudinary, muestra un recuadro en lugar del
// ícono de imagen rota.
// Hojas a lo largo del tallo: posición, ángulo y tamaño, de abajo hacia arriba
const oliveLeaves = [
  [92, 180, -150, 1], [84, 160, -20, 1.05], [74, 140, -160, 1.1], [66, 120, -35, 1.1],
  [57, 100, -165, 1.05], [50, 80, -45, 1], [44, 60, -170, 0.95], [40, 40, -55, 0.9],
  [37, 22, -175, 0.8],
]

// Rama de olivo a línea fina, como el ícono del álbum, que abraza el retrato
function OliveBranch({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 200" aria-hidden="true">
      <path className="olive-stem" d="M104 198 C 80 160, 52 110, 36 8" />
      {oliveLeaves.map(([x, y, angle, scale], index) => (
        <g key={index} transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
          <path
            className="olive-leaf"
            style={{ animationDelay: `${0.5 + index * 0.08}s` }}
            d="M0 0 C 7 -7, 19 -7, 26 0 C 19 7, 7 7, 0 0 Z"
          />
        </g>
      ))}
    </svg>
  )
}

function PhotoImage({ src, alt, ...props }) {
  const [failedSrc, setFailedSrc] = useState(null)

  if (failedSrc === src) {
    return (
      <span className="photo-missing" role="img" aria-label={alt || 'Foto no disponible'}>
        Foto no disponible
      </span>
    )
  }

  return <img src={src} alt={alt} onError={() => setFailedSrc(src)} {...props} />
}

// Evita volver a dibujar la galería cuando una revisión trae exactamente lo mismo
function keepIfUnchanged(current, next) {
  return JSON.stringify(current) === JSON.stringify(next) ? current : next
}

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
  const submissionIdRef = useRef(null)
  const photoIdsRef = useRef(new WeakMap())
  const [statusMessage, setStatusMessage] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminToken, setAdminToken] = useState(readStoredAdminToken)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => Boolean(readStoredAdminToken()))
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
  // Cambia cada vez que la familia modera o borra; una revisión automática que
  // empezó antes descarta su respuesta para no regresar fotos ya movidas.
  const photoChangesRef = useRef(0)

  useEffect(() => {
    loadPublishedPhotos()
  }, [])

  // Cada pantalla (portada, subir fotos, confirmación) se abre desde arriba
  useLayoutEffect(() => {
    if (view !== 'admin') window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view])

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

  // Las fotos nuevas aparecen solas, sin recargar: la galería se revisa cada
  // 45 s y, en el panel familiar, las pendientes cada 20 s. Solo con la
  // pantalla visible, y de inmediato al volver a la pestaña.
  useEffect(() => {
    if (isStaticDemo) return undefined
    const watchingAdmin = view === 'admin' && isAdminAuthenticated
    if (view !== 'home' && !watchingAdmin) return undefined

    function refresh() {
      if (document.visibilityState !== 'visible') return
      loadPublishedPhotos({ background: true })
      if (watchingAdmin) loadPendingPhotos({ background: true })
    }

    const timer = window.setInterval(refresh, watchingAdmin ? 20000 : 45000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [view, isAdminAuthenticated, adminToken])

  const gallerySubmissions = useMemo(() => groupPhotosBySubmission(publishedPhotos), [publishedPhotos])
  // El visor recorre las fotos en el mismo orden en que se ven en el collage
  const galleryPhotos = useMemo(
    () => gallerySubmissions.flatMap((submission) => submission.photos),
    [gallerySubmissions]
  )

  // Las vistas previas se crean una vez por selección; antes se regeneraban
  // con cada letra escrita en el nombre o el mensaje.
  const previewUrls = useMemo(
    () => selectedFiles.map((file) => URL.createObjectURL(file)),
    [selectedFiles]
  )
  useEffect(
    () => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)),
    [previewUrls]
  )

  useEffect(() => {
    if (!uploading) return undefined

    // Avisa antes de cerrar o recargar la página a mitad de una subida
    function warnBeforeLeaving(event) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [uploading])

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

  async function loadPublishedPhotos({ background = false } = {}) {
    if (isStaticDemo) {
      return
    }

    const changesAtStart = photoChangesRef.current
    try {
      const response = await fetch(`${apiUrl}/api/photos?status=published`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar los recuerdos.')
      }
      if (background && photoChangesRef.current !== changesAtStart) return
      setPublishedPhotos((current) => keepIfUnchanged(current, data.photos ?? []))
    } catch (error) {
      console.error('Error loading published photos', error)
      // Un fallo en una revisión automática no se muestra; se reintenta sola
      if (!background) setStatusMessage(error.message)
    }
  }

  function endAdminSession(message) {
    storeAdminToken('')
    setAdminToken('')
    setIsAdminAuthenticated(false)
    setAdminNotice('')
    setSelectedPhotoIds([])
    closeLightbox()
    setAdminError(message)
  }

  // Si el servidor ya no acepta la sesión, se vuelve a pedir la contraseña
  // en lugar de dejar el panel mostrando errores.
  async function adminFetch(path, options = {}) {
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${adminToken}` },
    })
    if (response.status === 401) {
      const message = 'Tu sesión expiró. Vuelve a iniciar sesión.'
      endAdminSession(message)
      throw new Error(message)
    }
    return response
  }

  async function loadPendingPhotos({ background = false } = {}) {
    if (isStaticDemo) {
      return
    }

    const changesAtStart = photoChangesRef.current
    try {
      const response = await adminFetch('/api/photos?status=pending')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar las fotos pendientes.')
      }
      if (background && photoChangesRef.current !== changesAtStart) return
      setPendingPhotos((current) => keepIfUnchanged(current, data.photos ?? []))
    } catch (error) {
      console.error('Error loading pending photos', error)
      if (!background) setAdminError(error.message)
    }
  }

  function handlePhotoPick(event) {
    const files = Array.from(event.target.files ?? [])
    // Permite volver a elegir los mismos archivos después de un aviso
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    const validFiles = files.filter(
      (file) => validImageTypes.includes(file.type) && file.size <= 60 * 1024 * 1024
    )

    if (!validFiles.length) {
      setStatusMessage('Solo se permiten fotos JPG, JPEG, PNG y WEBP.')
      return
    }

    const limitedFiles = validFiles.slice(0, 20)
    const skippedFormatCount = files.length - validFiles.length
    const skippedLimitCount = validFiles.length - limitedFiles.length
    const notices = []
    if (skippedFormatCount) {
      notices.push(
        `${skippedFormatCount} ${skippedFormatCount === 1 ? 'archivo no se agregó porque no es' : 'archivos no se agregaron porque no son'} JPG, PNG o WEBP.`
      )
    }
    if (skippedLimitCount) {
      notices.push(`Puedes enviar hasta 20 fotos a la vez; envía las ${skippedLimitCount} restantes después.`)
    }

    setSelectedFiles(limitedFiles)
    setStatusMessage(notices.join(' '))
    setView('upload')
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

    // Los identificadores se conservan entre reintentos: las fotos que falten
    // se suman al mismo bloque y las que ya llegaron no se duplican.
    submissionIdRef.current ??= crypto.randomUUID()
    const total = selectedFiles.length
    const failedFiles = []
    let lastError = null

    setUploading(true)
    setUploadProgress(0)

    // De una en una: si se corta la señal solo hay que repetir la foto afectada
    for (const [index, file] of selectedFiles.entries()) {
      setStatusMessage(`Subiendo foto ${index + 1} de ${total}...`)
      if (!photoIdsRef.current.has(file)) {
        photoIdsRef.current.set(file, crypto.randomUUID())
      }

      try {
        await uploadPhotoWithRetry(await prepareImageForUpload(file), {
          photoId: photoIdsRef.current.get(file),
          submissionId: submissionIdRef.current,
          guestName,
          message,
        })
      } catch (error) {
        console.error('Error uploading photo', error)
        failedFiles.push(file)
        lastError = error
      }
      setUploadProgress(Math.round(((index + 1) / total) * 100))
    }

    setUploading(false)

    if (!failedFiles.length) {
      submissionIdRef.current = null
      setSelectedFiles([])
      setGuestName('')
      setMessage('')
      setView('confirm')
      setStatusMessage('Tus fotografías quedaron pendientes de revisión familiar.')
      return
    }

    setSelectedFiles(failedFiles)
    const sentCount = total - failedFiles.length
    setStatusMessage(
      sentCount
        ? `Se enviaron ${sentCount} de ${total} fotos. Las ${failedFiles.length} restantes no se pudieron subir; revisa tu conexión y toca "Compartir recuerdos" para reintentarlas.`
        : lastError?.message || 'No se pudieron subir tus fotos. Revisa tu conexión e inténtalo de nuevo.'
    )
  }

  async function uploadPhotoWithRetry(file, fields) {
    const formData = new FormData()
    formData.append('photos', file)
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value))

    let lastError = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, attempt * 3000))
      }

      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 120000)
      try {
        const response = await fetch(`${apiUrl}/api/photos`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })
        if (response.ok) return

        const data = await response.json().catch(() => ({}))
        lastError = new Error(data.message || 'No se pudo subir la foto.')
        // Un archivo inválido o demasiado grande fallará igual en cada intento
        if ([400, 413].includes(response.status)) break
      } catch (error) {
        lastError = new Error(
          error.name === 'AbortError'
            ? 'La subida tardó demasiado. Revisa tu conexión.'
            : 'Se perdió la conexión al subir la foto.'
        )
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    throw lastError
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
      storeAdminToken(data.token)

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

    photoChangesRef.current += 1
    try {
      const response = await adminFetch(`/api/photos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'No se pudo actualizar la fotografía.')
      }
    } catch (error) {
      setAdminError(error.message || 'No se pudo actualizar la fotografía.')
      return false
    } finally {
      photoChangesRef.current += 1
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
    photoChangesRef.current += 1

    try {
      let warning = ''
      if (isStaticDemo) {
        setPendingPhotos((current) => current.filter((photo) => photo.id !== id))
        setPublishedPhotos((current) => current.filter((photo) => photo.id !== id))
        setArchivedPhotos((current) => current.filter((photo) => photo.id !== id))
      } else {
        const response = await adminFetch(`/api/photos/${encodeURIComponent(id)}`, {
          method: 'DELETE',
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
      photoChangesRef.current += 1
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
      const response = await adminFetch('/api/photos?status=archived')
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
                <PhotoImage src={thumbnailUrl(photo.image_url)} alt="" loading="lazy" decoding="async" />
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

    const response = isStaticDemo
      ? await fetch(photo.image_url)
      : await adminFetch(`/api/photos/${encodeURIComponent(photo.id)}/download`)
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

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {view === 'home' && (
          <main className="screen home-screen">
            <section className="hero-panel hero-arch">
              <div className="hero-copy">
                <div className="hero-portrait">
                  <OliveBranch className="olive-branch olive-left" />
                  <OliveBranch className="olive-branch olive-right" />
                  <img src={`${import.meta.env.BASE_URL}matias/matias-01.jpg`} alt="Matías" />
                </div>
                <p className="eyebrow">Mi bautizo</p>
                <h1>MATÍAS</h1>
                <p className="date-line">7 de noviembre</p>
                <div className="heart-divider" aria-hidden="true"><span>†</span></div>
                <p className="welcome-text">
                  Gracias por acompañarnos
                  <span>en este día tan especial.</span>
                </p>
                <p className="share-hint">
                  Comparte las fotos que tomes hoy y ayúdanos a guardar los recuerdos de este día.
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

            {familyPhotos.length > 0 && (
              <section className="family-album" aria-label={familyMessage.title}>
                <figure className="family-letter">
                  <span className="guest-note-mark" aria-hidden="true">“</span>
                  <h2>{familyMessage.title}</h2>
                  <blockquote>{familyMessage.text}</blockquote>
                  <figcaption>{familyMessage.signature}</figcaption>
                </figure>
                <div className="family-columns">
                  {splitIntoColumns(familyPhotos).map((column, columnIndex) => (
                    <div className="family-column" key={columnIndex}>
                      {column.map(({ photo, index }) => (
                        <button
                          type="button"
                          key={photo.id}
                          className="photo-card"
                          style={{ aspectRatio: `1 / ${photo.ratio}` }}
                          onClick={() => openLightbox(index, familyPhotos, false)}
                          aria-label="Abrir foto en pantalla completa"
                        >
                          <PhotoImage src={photo.image_url} alt="Matías" loading="lazy" decoding="async" />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!isStaticDemo && publishedPhotos.length > 0 ? (
              <section className="gallery-section" id="gallery">
                <div className="gallery-heading">
                  <div className="title-divider" aria-hidden="true" />
                  <h2>Recuerdos</h2>
                  <div className="title-divider" aria-hidden="true" />
                  <p>
                    {galleryPhotos.length === 1
                      ? '1 recuerdo compartido por nuestros invitados'
                      : `${galleryPhotos.length} recuerdos compartidos por nuestros invitados`}
                  </p>
                </div>
                <div className="gallery-masonry">
                  {gallerySubmissions.map((submission) => {
                    const hasNote = (submission.message ?? '').trim() !== ''
                    return submission.photos.flatMap((photo, photoIndex) => {
                      const tiles = [
                        <button
                          type="button"
                          key={photo.id}
                          className="photo-card"
                          onClick={() => openLightbox(galleryPhotos.indexOf(photo), galleryPhotos)}
                          aria-label="Abrir foto en pantalla completa"
                        >
                          <PhotoImage
                            src={thumbnailUrl(photo.image_url)}
                            alt={photo.message || 'Foto del bautizo'}
                            loading="lazy"
                            decoding="async"
                          />
                        </button>,
                      ]
                      // El mensaje del invitado va junto a su primera foto, como en un libro de firmas
                      if (hasNote && photoIndex === 0) {
                        tiles.push(
                          <figure key={`${submission.id}-note`} className="guest-note">
                            <span className="guest-note-mark" aria-hidden="true">“</span>
                            <blockquote>{submission.message}</blockquote>
                            <figcaption>{submission.guest_name || 'Invitado'}</figcaption>
                          </figure>
                        )
                      }
                      return tiles
                    })
                  })}
                </div>
              </section>
            ) : (
              <section className="review-notice" aria-live="polite">
                <span className="review-notice-mark" aria-hidden="true">✦</span>
                <h2>El álbum se está llenando</h2>
                <p>
                  Aquí aparecerán las fotos de los invitados en cuanto la familia las revise.
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

            <div className="upload-intro">
              <h2>Comparte tus fotos</h2>
              <p>
                Elige las fotos que tomaste hoy. La familia las revisará antes de
                publicarlas en el álbum.
              </p>
            </div>

            <div className="upload-panel">
              {isStaticDemo && (
                <p className="status-message">
                  El envío de fotografías todavía no está disponible; las fotos no se enviarán a la familia.
                </p>
              )}

              <section className="upload-step">
                <h3 className="upload-step-title">
                  <span className="upload-step-number" aria-hidden="true">1</span>
                  Elige tus fotos
                </h3>
                <input
                  ref={fileInputRef}
                  id="photo-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotoPick}
                  hidden
                />

                {selectedFiles.length === 0 ? (
                  <label htmlFor="photo-upload" className="photo-picker">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h3l1.4-2h7.2L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span className="photo-picker-title">Toca para elegir fotos</span>
                    <span className="photo-picker-hint">Puedes elegir hasta 20 a la vez</span>
                  </label>
                ) : (
                  <>
                    <div className="selected-grid">
                      {selectedFiles.map((file, index) => {
                        return (
                          <div className="selected-photo" key={`${file.name}-${index}`}>
                            <img src={previewUrls[index]} alt={file.name} decoding="async" />
                            <button
                              type="button"
                              className="remove-photo"
                              onClick={() => handleRemoveSelected(index)}
                              aria-label={`Eliminar ${file.name}`}
                              disabled={uploading}
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <div className="selection-summary">
                      <p className="selection-count">
                        {selectedFiles.length === 1 ? '1 foto lista' : `${selectedFiles.length} fotos listas`}
                      </p>
                      {!uploading && (
                        <label htmlFor="photo-upload" className="change-photos">
                          Elegir otras
                        </label>
                      )}
                    </div>
                  </>
                )}
              </section>

              <section className="upload-step">
                <h3 className="upload-step-title">
                  <span className="upload-step-number" aria-hidden="true">2</span>
                  Un mensaje para la familia
                  <span className="optional-tag">opcional</span>
                </h3>

                <div className="field-group">
                  <label htmlFor="guestName">Tu nombre</label>
                  <input
                    id="guestName"
                    type="text"
                    placeholder="Ej. Tía María"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="message">Mensaje</label>
                  <textarea
                    id="message"
                    rows="3"
                    placeholder="Déjale un mensaje bonito a la familia de Matías ❤️"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </div>
              </section>

              <button
                type="button"
                className={`primary-button submit-button${selectedFiles.length === 0 ? ' is-empty' : ''}`}
                onClick={handleSubmitPhotos}
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading
                  ? 'Subiendo tus fotos...'
                  : selectedFiles.length > 1
                    ? `Enviar ${selectedFiles.length} fotos`
                    : 'Enviar foto'}
              </button>
              {!uploading && selectedFiles.length === 0 && (
                <p className="submit-hint">Primero elige al menos una foto.</p>
              )}

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

            <PhotoImage src={displayUrl(lightboxPhotos[lightboxIndex].image_url)} alt="Foto ampliada" />

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
