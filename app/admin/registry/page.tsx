'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Plus, Edit, Trash2, Gift } from 'lucide-react'
import Link from 'next/link'

interface Registry {
  id: string
  title: string
  description: string
  url?: string | null
  priority: number
}

export default function RegistryAdminPage() {
  const [registries, setRegistries] = useState<Registry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRegistry, setEditingRegistry] = useState<Registry | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    priority: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    loadRegistries()
  }, [])

  const loadRegistries = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/registry')
      const data = await response.json()
      
      if (data.success) {
        setRegistries(data.registries)
      } else {
        toast({
          title: "Error",
          description: "Failed to load registries",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading registries:', error)
      toast({
        title: "Error",
        description: "Failed to load registries",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingRegistry ? `/api/admin/registry/${editingRegistry.id}` : '/api/admin/registry'
      const method = editingRegistry ? 'PUT' : 'POST'
      
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
          description: editingRegistry ? "Registry updated successfully" : "Registry added successfully",
        })
        setShowForm(false)
        setEditingRegistry(null)
        setFormData({ title: '', description: '', url: '', priority: 0 })
        loadRegistries()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save registry",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving registry:', error)
      toast({
        title: "Error",
        description: "Failed to save registry",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (registry: Registry) => {
    setEditingRegistry(registry)
    setFormData({
      title: registry.title,
      description: registry.description,
      url: registry.url || '',
      priority: registry.priority
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this registry?')) return
    
    try {
      const response = await fetch(`/api/admin/registry/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Registry deleted successfully",
        })
        loadRegistries()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete registry",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting registry:', error)
      toast({
        title: "Error",
        description: "Failed to delete registry",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingRegistry(null)
    setFormData({ title: '', description: '', url: '', priority: 0 })
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading registries...</div>
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
            <h1 className="text-2xl lg:text-3xl font-bold text-gold-800">Registry Management</h1>
            <p className="text-gold-600">Manage wedding registries</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Registry
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingRegistry ? 'Edit Registry' : 'Add New Registry'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter registry title"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter registry description"
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="url">Registry URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/registry"
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-sm text-gray-500 mt-1">
                Lower numbers appear first
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="flex-1 sm:flex-none">
                {editingRegistry ? 'Update Registry' : 'Add Registry'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Registries */}
      {registries.length === 0 ? (
        <Card className="text-center p-12">
          <Gift className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Registries Yet</h3>
          <p className="text-gray-500 mb-4">Add your first registry to get started</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Registry
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {registries.map((registry) => (
            <Card key={registry.id} className="p-6">
              <div className="flex flex-col h-full">
                <div className="flex-1 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Priority: {registry.priority}</span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{registry.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{registry.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(registry)}
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 sm:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(registry.id)}
                    className="text-red-600 hover:text-red-700 flex-1"
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

