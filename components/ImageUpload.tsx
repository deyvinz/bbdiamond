'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  value?: string // Current image URL
  onChange: (url: string) => void // Callback when image URL changes
  disabled?: boolean
  accept?: string // MIME types to accept (default: image/*)
  maxSize?: number // Max file size in bytes (default: 5MB)
  label?: string
  className?: string
}

export default function ImageUpload({
  value,
  onChange,
  disabled = false,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
  label = 'Image',
  className = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(value || null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Validate file before upload
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file type - allow image/* or HEIC/HEIF specifically
      const isImage = file.type.startsWith('image/')
      const extension = file.name.split('.').pop()?.toLowerCase()
      const isHeicExtension = extension === 'heic' || extension === 'heif'
      
      if (!isImage && !isHeicExtension) {
        return {
          valid: false,
          error: 'Please select an image file',
        }
      }

      // Check file size
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File size exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
        }
      }

      return { valid: true }
    },
    [maxSize]
  )

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file
      const validation = validateFile(file)
      if (!validation.valid) {
        toast({
          title: 'Invalid File',
          description: validation.error,
          variant: 'destructive',
        })
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload file
      setUploading(true)
      setUploadProgress(0)

      try {
        const formData = new FormData()
        formData.append('file', file)

        // Use XMLHttpRequest for upload progress
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100
            setUploadProgress(percentComplete)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText)
              if (response.success && response.url) {
                onChange(response.url)
                toast({
                  title: 'Image Uploaded Successfully',
                  description: 'Your image has been uploaded and is ready to use.',
                })
              } else {
                throw new Error(response.error || 'Upload failed')
              }
            } catch (parseError) {
              throw new Error('Failed to parse server response')
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText)
              throw new Error(errorResponse.error || `Upload failed with status ${xhr.status}`)
            } catch (parseError) {
              throw new Error(`Upload failed with status ${xhr.status}`)
            }
          }
          setUploading(false)
          setUploadProgress(0)
        })

        xhr.addEventListener('error', () => {
          toast({
            title: 'Upload Failed',
            description: 'Network error occurred while uploading. Please try again.',
            variant: 'destructive',
          })
          setUploading(false)
          setUploadProgress(0)
          setPreview(null)
        })

        xhr.open('POST', '/api/upload/image')
        xhr.send(formData)
      } catch (error) {
        console.error('Upload error:', error)
        toast({
          title: 'Upload Failed',
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          variant: 'destructive',
        })
        setUploading(false)
        setUploadProgress(0)
        setPreview(null)
      }
    },
    [validateFile, onChange, toast]
  )

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (disabled || uploading) {
        return
      }

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [disabled, uploading, handleFileSelect]
  )

  // Handle remove image
  const handleRemove = () => {
    setPreview(null)
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Update preview when value changes externally
  useEffect(() => {
    if (value && value !== preview) {
      setPreview(value)
    } else if (!value && preview) {
      setPreview(null)
    }
  }, [value, preview])

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>

      {preview ? (
        <div className="relative group">
          <div className="relative w-full h-48 rounded-md border border-gray-200 overflow-hidden bg-gray-50">
            {preview.startsWith('data:') || 
             (preview.startsWith('http') && !preview.includes('.supabase.co/storage')) ? (
              // Use regular img tag for external URLs or data URLs
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              // Use Next.js Image for Supabase storage URLs
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-contain"
                unoptimized={preview.startsWith('data:')}
              />
            )}
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                  className="z-10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            )}
          </div>
          {uploading && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1 text-center">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`
            relative border-2 border-dashed rounded-md p-6
            transition-colors
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
            ${uploading ? 'pointer-events-none' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept.includes('*') 
              ? 'image/*,.heic,.heif,image/heic,image/heif' 
              : accept}
            onChange={handleInputChange}
            disabled={disabled || uploading}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center text-center space-y-2">
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                <p className="text-sm text-gray-600">Uploading...</p>
                <div className="w-full max-w-xs">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(uploadProgress)}%
                  </p>
                </div>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                      Click to upload
                    </span>{' '}
                    or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF, WEBP, HEIC, HEIF up to {(maxSize / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!preview && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          Choose File
        </Button>
      )}
    </div>
  )
}

