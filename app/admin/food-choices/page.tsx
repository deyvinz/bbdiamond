'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Plus, Edit, Trash2, Utensils } from 'lucide-react'
import Link from 'next/link'

interface FoodChoice {
  id: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
}

export default function FoodChoicesAdminPage() {
  const [items, setItems] = useState<FoodChoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<FoodChoice | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setLoading(true)
      // Load all items including inactive ones for admin view
      const response = await fetch('/api/admin/food-choices?all=true')
      const data = await response.json()
      
      if (data.success) {
        setItems(data.food_choices || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load food choices",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading food choices:', error)
      toast({
        title: "Error",
        description: "Failed to load food choices",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Food choice name is required",
        variant: "destructive",
      })
      return
    }
    
    try {
      const url = editingItem ? `/api/admin/food-choices/${editingItem.id}` : '/api/admin/food-choices'
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
          description: editingItem ? "Food choice updated successfully" : "Food choice added successfully",
        })
        setShowForm(false)
        setEditingItem(null)
        setFormData({ name: '', description: '', display_order: 0 })
        loadItems()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save food choice",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving food choice:', error)
      toast({
        title: "Error",
        description: "Failed to save food choice",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (item: FoodChoice) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      display_order: item.display_order
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this food choice? This will hide it from the RSVP form.')) return
    
    try {
      const response = await fetch(`/api/admin/food-choices/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Food choice deleted successfully",
        })
        loadItems()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete food choice",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting food choice:', error)
      toast({
        title: "Error",
        description: "Failed to delete food choice",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingItem(null)
    setFormData({ name: '', description: '', display_order: 0 })
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading food choices...</div>
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
            <h1 className="text-2xl lg:text-3xl font-bold text-gold-800">Food Choices Management</h1>
            <p className="text-gold-600">Manage meal options for RSVP forms</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Food Choice
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingItem ? 'Edit Food Choice' : 'Add New Food Choice'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Food Choice Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Beef, Chicken, Vegetarian, Vegan"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of the food choice"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-sm text-gray-500 mt-1">
                Lower numbers appear first in the RSVP form
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="flex-1 sm:flex-none">
                {editingItem ? 'Update Food Choice' : 'Add Food Choice'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Food Choices List */}
      {items.length === 0 ? (
        <Card className="text-center p-12">
          <Utensils className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Food Choices Yet</h3>
          <p className="text-gray-500 mb-4">Add food choices to give guests meal options during RSVP</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Food Choice
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {items
            .filter(item => item.is_active) // Only show active items in main list
            .sort((a, b) => a.display_order - b.display_order)
            .map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-xs text-gray-500 mt-1">Order: {item.display_order}</span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h3>
                  {item.description && (
                    <p className="text-gray-600">{item.description}</p>
                  )}
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

