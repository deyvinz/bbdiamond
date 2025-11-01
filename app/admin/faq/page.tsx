'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Plus, Edit, Trash2, HelpCircle } from 'lucide-react'
import Link from 'next/link'

interface FAQItem {
  id: string
  question: string
  answer: string
  display_order: number
}

export default function FAQAdminPage() {
  const [items, setItems] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null)
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    display_order: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/faq')
      const data = await response.json()
      
      if (data.success) {
        setItems(data.items)
      } else {
        toast({
          title: "Error",
          description: "Failed to load FAQ items",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading FAQ items:', error)
      toast({
        title: "Error",
        description: "Failed to load FAQ items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingItem ? `/api/admin/faq/${editingItem.id}` : '/api/admin/faq'
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
          description: editingItem ? "FAQ item updated successfully" : "FAQ item added successfully",
        })
        setShowForm(false)
        setEditingItem(null)
        setFormData({ question: '', answer: '', display_order: 0 })
        loadItems()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save FAQ item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving FAQ item:', error)
      toast({
        title: "Error",
        description: "Failed to save FAQ item",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (item: FAQItem) => {
    setEditingItem(item)
    setFormData({
      question: item.question,
      answer: item.answer,
      display_order: item.display_order
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ item?')) return
    
    try {
      const response = await fetch(`/api/admin/faq/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "FAQ item deleted successfully",
        })
        loadItems()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete FAQ item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting FAQ item:', error)
      toast({
        title: "Error",
        description: "Failed to delete FAQ item",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingItem(null)
    setFormData({ question: '', answer: '', display_order: 0 })
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading FAQ items...</div>
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
            <h1 className="text-2xl lg:text-3xl font-bold text-gold-800">FAQ Management</h1>
            <p className="text-gold-600">Manage frequently asked questions</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add FAQ Item
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingItem ? 'Edit FAQ Item' : 'Add New FAQ Item'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="question">Question *</Label>
              <Input
                id="question"
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Enter the question"
                required
              />
            </div>
            <div>
              <Label htmlFor="answer">Answer *</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Enter the answer"
                rows={4}
                required
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
                Lower numbers appear first in the FAQ
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="flex-1 sm:flex-none">
                {editingItem ? 'Update FAQ Item' : 'Add FAQ Item'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* FAQ Items */}
      {items.length === 0 ? (
        <Card className="text-center p-12">
          <HelpCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No FAQ Items Yet</h3>
          <p className="text-gray-500 mb-4">Add your first FAQ item to get started</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First FAQ Item
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-xs text-gray-500 mt-1">Order: {item.display_order}</span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.question}</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{item.answer}</p>
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

