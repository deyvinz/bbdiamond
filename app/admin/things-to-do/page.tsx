'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Plus, Edit, Trash2, MapPin } from 'lucide-react'
import Link from 'next/link'

interface ThingsToDoItem {
  id: string
  title: string
  description: string
  map_url?: string | null
  website?: string | null
  sort_order: number
}

export default function ThingsToDoAdminPage() {
  const [items, setItems] = useState<ThingsToDoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ThingsToDoItem | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    map_url: '',
    website: '',
    sort_order: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/things-to-do')
      const data = await response.json()
      
      if (data.success) {
        setItems(data.items)
      } else {
        toast({
          title: "Error",
          description: "Failed to load things to do",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading things to do:', error)
      toast({
        title: "Error",
        description: "Failed to load things to do",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingItem ? `/api/admin/things-to-do/${editingItem.id}` : '/api/admin/things-to-do'
      const method = editingItem ? 'PUT' : 'POST'
      
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
          description: editingItem ? "Activity updated successfully" : "Activity added successfully",
        })
        setShowForm(false)
        setEditingItem(null)
        setFormData({ title: '', description: '', map_url: '', website: '', sort_order: 0 })
        loadItems()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save activity",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving activity:', error)
      toast({
        title: "Error",
        description: "Failed to save activity",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (item: ThingsToDoItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      description: item.description,
      map_url: item.map_url || '',
      website: item.website || '',
      sort_order: item.sort_order
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return
    
    try {
      const response = await fetch(`/api/admin/things-to-do/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Activity deleted successfully",
        })
        loadItems()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete activity",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting activity:', error)
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingItem(null)
    setFormData({ title: '', description: '', map_url: '', website: '', sort_order: 0 })
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading activities...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gold-800">Things to Do Management</h1>
            <p className="text-gold-600">Manage local activities and attractions</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingItem ? 'Edit Activity' : 'Add New Activity'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter activity title"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter activity description"
                rows={4}
                required
              />
            </div>
            <div>
              <Label htmlFor="map_url">Map URL</Label>
              <Input
                id="map_url"
                type="url"
                value={formData.map_url}
                onChange={(e) => setFormData({ ...formData, map_url: e.target.value })}
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div>
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
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
                Lower numbers appear first
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="flex-1 sm:flex-none">
                {editingItem ? 'Update Activity' : 'Add Activity'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Activities */}
      {items.length === 0 ? (
        <Card className="text-center p-12">
          <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Activities Yet</h3>
          <p className="text-gray-500 mb-4">Add your first activity to get started</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Activity
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-xs text-gray-500 mt-1">Order: {item.sort_order}</span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-3">{item.description}</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {item.map_url && (
                      <a
                        href={item.map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Map
                      </a>
                    )}
                    {item.website && (
                      <a
                        href={item.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(item)}
                    className="flex-shrink-0"
                  >
                    <Edit className="w-3 h-3 sm:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-700 flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3 sm:mr-2" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

