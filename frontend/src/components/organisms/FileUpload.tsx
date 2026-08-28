import { forwardRef, useState, useRef, useCallback, ChangeEvent, DragEvent } from 'react'
import { Upload, X, File, Image, FileText, Film, Music, Archive, AlertCircle, CheckCircle } from 'lucide-react'

// ============================================
// TYPES
// ============================================
export interface UploadedFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  preview?: string
}

export interface FileUploadProps {
  /** Aceptar tipos de archivo específicos (ej: "image/*,.pdf") */
  accept?: string
  /** Permitir múltiples archivos */
  multiple?: boolean
  /** Tamaño máximo por archivo en bytes */
  maxSize?: number
  /** Número máximo de archivos */
  maxFiles?: number
  /** Callback cuando se seleccionan archivos */
  onFilesSelected?: (files: File[]) => void
  /** Callback cuando un archivo se sube correctamente */
  onUploadComplete?: (file: UploadedFile) => void
  /** Callback cuando hay un error */
  onError?: (error: string, file?: File) => void
  /** Función personalizada de upload (retorna Promise) */
  uploadFn?: (file: File, onProgress: (progress: number) => void) => Promise<void>
  /** Archivos ya subidos (controlado) */
  value?: UploadedFile[]
  /** Callback cuando cambia la lista de archivos */
  onChange?: (files: UploadedFile[]) => void
  /** Texto del área de drop */
  dropzoneText?: string
  /** Mostrar preview de imágenes */
  showPreview?: boolean
  /** Deshabilitado */
  disabled?: boolean
  /** Variante visual */
  variant?: 'default' | 'compact' | 'minimal'
  /** Clases adicionales */
  className?: string
}

// ============================================
// HELPERS
// ============================================
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image
  if (type.startsWith('video/')) return Film
  if (type.startsWith('audio/')) return Music
  if (type.includes('pdf') || type.includes('document')) return FileText
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return Archive
  return File
}

const generateId = () => Math.random().toString(36).substring(2, 9)

// ============================================
// COMPONENT
// ============================================
export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      accept,
      multiple = false,
      maxSize = 10 * 1024 * 1024, // 10MB default
      maxFiles = 10,
      onFilesSelected,
      onUploadComplete,
      onError,
      uploadFn,
      value,
      onChange,
      dropzoneText = 'Arrastra archivos aquí o haz clic para seleccionar',
      showPreview = true,
      disabled = false,
      variant = 'default',
      className = '',
    },
    ref
  ) => {
    const [files, setFiles] = useState<UploadedFile[]>(value || [])
    const [isDragging, setIsDragging] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Sync with controlled value
    const currentFiles = value !== undefined ? value : files

    const updateFiles = useCallback(
      (newFiles: UploadedFile[]) => {
        if (onChange) {
          onChange(newFiles)
        } else {
          setFiles(newFiles)
        }
      },
      [onChange]
    )

    // Validate file
    const validateFile = (file: File): string | null => {
      if (maxSize && file.size > maxSize) {
        return `El archivo excede el tamaño máximo de ${formatFileSize(maxSize)}`
      }
      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim())
        const isValid = acceptedTypes.some((type) => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase())
          }
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('/*', '/'))
          }
          return file.type === type
        })
        if (!isValid) {
          return 'Tipo de archivo no permitido'
        }
      }
      return null
    }

    // Process files
    const processFiles = useCallback(
      async (selectedFiles: FileList | File[]) => {
        const fileArray = Array.from(selectedFiles)

        // Check max files
        if (currentFiles.length + fileArray.length > maxFiles) {
          onError?.(`Máximo ${maxFiles} archivos permitidos`)
          return
        }

        const newUploadedFiles: UploadedFile[] = []

        for (const file of fileArray) {
          const error = validateFile(file)
          if (error) {
            onError?.(error, file)
            continue
          }

          const uploadedFile: UploadedFile = {
            id: generateId(),
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            progress: 0,
            status: 'pending',
          }

          // Generate preview for images
          if (showPreview && file.type.startsWith('image/')) {
            uploadedFile.preview = URL.createObjectURL(file)
          }

          newUploadedFiles.push(uploadedFile)
        }

        if (newUploadedFiles.length === 0) return

        const updatedFiles = multiple
          ? [...currentFiles, ...newUploadedFiles]
          : newUploadedFiles

        updateFiles(updatedFiles)
        onFilesSelected?.(newUploadedFiles.map((f) => f.file))

        // Auto-upload if uploadFn provided
        if (uploadFn) {
          for (const uploadedFile of newUploadedFiles) {
            try {
              // Update status to uploading
              const startUpload = updatedFiles.map((f) =>
                f.id === uploadedFile.id ? { ...f, status: 'uploading' as const } : f
              )
              updateFiles(startUpload)

              await uploadFn(uploadedFile.file, (progress) => {
                const updated = updatedFiles.map((f) =>
                  f.id === uploadedFile.id ? { ...f, progress } : f
                )
                updateFiles(updated)
              })

              // Update status to success
              const successUpdate = updatedFiles.map((f) =>
                f.id === uploadedFile.id
                  ? { ...f, status: 'success' as const, progress: 100 }
                  : f
              )
              updateFiles(successUpdate)
              onUploadComplete?.(uploadedFile)
            } catch (err) {
              // Update status to error
              const errorUpdate = updatedFiles.map((f) =>
                f.id === uploadedFile.id
                  ? { ...f, status: 'error' as const, error: 'Error al subir el archivo' }
                  : f
              )
              updateFiles(errorUpdate)
              onError?.('Error al subir el archivo', uploadedFile.file)
            }
          }
        }
      },
      [currentFiles, maxFiles, multiple, onError, onFilesSelected, onUploadComplete, showPreview, updateFiles, uploadFn]
    )

    // Remove file
    const removeFile = (id: string) => {
      const fileToRemove = currentFiles.find((f) => f.id === id)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      updateFiles(currentFiles.filter((f) => f.id !== id))
    }

    // Handle input change
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files)
      }
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }

    // Drag & Drop handlers
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles)
      }
    }

    const FileIcon = (type: string) => {
      const Icon = getFileIcon(type)
      return <Icon className="w-5 h-5" />
    }

    return (
      <div ref={ref} className={`w-full ${className}`} data-testid="file-upload">
        {/* Dropzone */}
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            relative
            flex flex-col items-center justify-center
            ${variant === 'compact' ? 'p-[var(--spacing-md)]' : 'p-[var(--spacing-xl)]'}
            rounded-[var(--radius-lg)]
            border-2 border-dashed
            transition-all duration-[var(--transition-base)]
            cursor-pointer
            ${disabled
              ? 'border-[var(--border)] bg-[var(--muted)] cursor-not-allowed opacity-50'
              : isDragging
                ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                : 'border-[var(--border)] bg-[var(--secondary)]/50 hover:border-[var(--accent)]/50 hover:bg-[var(--secondary)]'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />

          <div
            className={`
              w-12 h-12 mb-[var(--spacing-md)]
              flex items-center justify-center
              rounded-full
              bg-[var(--accent)]/10
              text-[var(--accent)]
            `}
          >
            <Upload className="w-6 h-6" />
          </div>

          <p className="text-sm text-[var(--foreground)] font-medium text-center">
            {dropzoneText}
          </p>

          <p className="mt-[var(--spacing-xs)] text-xs text-[var(--foreground-muted)] text-center">
            {accept && `Formatos: ${accept}`}
            {accept && maxSize && ' • '}
            {maxSize && `Máx: ${formatFileSize(maxSize)}`}
          </p>
        </div>

        {/* File List */}
        {currentFiles.length > 0 && (
          <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]" data-testid="file-list">
            {currentFiles.map((file) => (
              <div
                key={file.id}
                className="
                  flex items-center gap-[var(--spacing-md)]
                  p-[var(--spacing-md)]
                  rounded-[var(--radius)]
                  bg-[var(--card)]
                  border border-[var(--card-border)]
                "
              >
                {/* Preview or Icon */}
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-10 h-10 rounded-[var(--radius-sm)] object-cover"
                  />
                ) : (
                  <div
                    className="
                      w-10 h-10
                      flex items-center justify-center
                      rounded-[var(--radius-sm)]
                      bg-[var(--secondary)]
                      text-[var(--foreground-muted)]
                    "
                  >
                    {FileIcon(file.type)}
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {formatFileSize(file.size)}
                  </p>

                  {/* Progress bar */}
                  {file.status === 'uploading' && (
                    <div className="mt-[var(--spacing-xs)] h-1 rounded-full bg-[var(--secondary)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-[var(--spacing-sm)]">
                  {file.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-[var(--destructive)]" />
                  )}

                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(file.id)
                    }}
                    className="
                      p-[var(--spacing-xs)]
                      rounded-[var(--radius-sm)]
                      text-[var(--foreground-muted)]
                      hover:text-[var(--destructive)]
                      hover:bg-[var(--destructive)]/10
                      transition-colors duration-[var(--transition-fast)]
                    "
                    aria-label="Eliminar archivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)

FileUpload.displayName = 'FileUpload'

export default FileUpload
