'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface GalleryImage {
  id: string
  url: string
  caption?: string
  sort_order: number
}

export default function GalleryAdminPage() {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null)
  const [formData, setFormData] = useState({
    url: '',
    caption: '',
    sort_order: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/gallery')
      const data = await response.json()
      
      if (data.success) {
        setImages(data.images)
      } else {
        toast({
          title: "Error",
          description: "Failed to load gallery images",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading images:', error)
      toast({
        title: "Error",
        description: "Failed to load gallery images",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingImage ? `/api/admin/gallery/${editingImage.id}` : '/api/admin/gallery'
      const method = editingImage ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: editingImage ? "Image updated successfully" : "Image added successfully",
        })
        setShowForm(false)
        setEditingImage(null)
        setFormData({ url: '', caption: '', sort_order: 0 })
        loadImages()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save image",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving image:', error)
      toast({
        title: "Error",
        description: "Failed to save image",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (image: GalleryImage) => {
    setEditingImage(image)
    setFormData({
      url: image.url,
      caption: image.caption || '',
      sort_order: image.sort_order
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return
    
    try {
      const response = await fetch(`/api/admin/gallery/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Image deleted successfully",
        })
        loadImages()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete image",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingImage(null)
    setFormData({ url: '', caption: '', sort_order: 0 })
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading gallery images...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gold-800">Gallery Management</h1>
            <p className="text-gold-600">Manage your wedding gallery images</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Image
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingImage ? 'Edit Image' : 'Add New Image'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="url">Image URL *</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                required
              />
            </div>
            <div>
              <Label htmlFor="caption">Caption</Label>
              <Textarea
                id="caption"
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                placeholder="Optional caption for the image"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-sm text-gray-500 mt-1">
                Lower numbers appear first in the gallery
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {editingImage ? 'Update Image' : 'Add Image'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Gallery Images */}
      {images.length === 0 ? (
        <Card className="text-center p-12">
          <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Images Yet</h3>
          <p className="text-gray-500 mb-4">Add your first gallery image to get started</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Image
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <Card key={image.id} className="p-0 overflow-hidden">
              <div className="aspect-square relative">
                <Image
                  src={image.url}
                  alt={image.caption || 'Gallery image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="p-4">
                {image.caption && (
                  <p className="text-sm text-gray-600 mb-2">{image.caption}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Order: {image.sort_order}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(image)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(image.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
