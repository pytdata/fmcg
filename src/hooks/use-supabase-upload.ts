import { useCallback, useEffect, useMemo, useState } from 'react'
import { type FileError, type FileRejection, useDropzone } from 'react-dropzone'

interface FileWithPreview extends File {
  preview?: string
  errors: readonly FileError[]
}

type UseFileUploadOptions = {
  /** Allowed MIME types e.g. ['image/*', 'image/png'] */
  allowedMimeTypes?: string[]
  /** Maximum file size in bytes */
  maxFileSize?: number
  /** Maximum number of files */
  maxFiles?: number
  /** Called with successfully selected files when ready */
  onFilesReady?: (files: File[]) => void
}

type UseSupabaseUploadReturn = ReturnType<typeof useSupabaseUpload>

const useSupabaseUpload = (options: UseFileUploadOptions = {}) => {
  const {
    allowedMimeTypes = [],
    maxFileSize = Number.POSITIVE_INFINITY,
    maxFiles = 1,
  } = options

  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([])
  const [successes, setSuccesses] = useState<string[]>([])

  const isSuccess = useMemo(() => {
    if (errors.length === 0 && successes.length === 0) return false
    return errors.length === 0 && successes.length === files.length
  }, [errors.length, successes.length, files.length])

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const validFiles = acceptedFiles
        .filter(f => !files.find(x => x.name === f.name))
        .map(f => {
          ;(f as FileWithPreview).preview = URL.createObjectURL(f)
          ;(f as FileWithPreview).errors = []
          return f as FileWithPreview
        })

      const invalidFiles = fileRejections.map(({ file, errors: errs }) => {
        ;(file as FileWithPreview).preview = URL.createObjectURL(file)
        ;(file as FileWithPreview).errors = errs
        return file as FileWithPreview
      })

      setFiles(prev => [...prev, ...validFiles, ...invalidFiles])
    },
    [files]
  )

  const dropzoneProps = useDropzone({
    onDrop,
    noClick: true,
    accept: allowedMimeTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    maxFiles,
    multiple: maxFiles !== 1,
  })

  /** No-op upload — actual uploading is handled by the caller via FormData/multer */
  const onUpload = useCallback(async () => {
    setLoading(true)
    const validFiles = files.filter(f => f.errors.length === 0)
    setSuccesses(validFiles.map(f => f.name))
    setErrors([])
    setLoading(false)
  }, [files])

  useEffect(() => {
    if (files.length === 0) setErrors([])

    if (files.length <= maxFiles) {
      let changed = false
      const updated = files.map(f => {
        if (f.errors.some(e => e.code === 'too-many-files')) {
          f.errors = f.errors.filter(e => e.code !== 'too-many-files')
          changed = true
        }
        return f
      })
      if (changed) setFiles(updated)
    }
  }, [files.length, maxFiles])

  return {
    files,
    setFiles,
    successes,
    isSuccess,
    loading,
    errors,
    setErrors,
    onUpload,
    maxFileSize,
    maxFiles,
    allowedMimeTypes,
    ...dropzoneProps,
  }
}

export { useSupabaseUpload, type UseFileUploadOptions, type UseSupabaseUploadReturn }
