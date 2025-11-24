'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import type { HomepageCTA } from '@/lib/homepage-ctas-service'

interface HomepageCTAsClientProps {
  initialCTAs: HomepageCTA[]
}

export default function HomepageCTAsClient({ initialCTAs }: HomepageCTAsClientProps) {
  const [ctas, setCTAs] = useState<HomepageCTA[]>(initialCTAs)
  const [showForm, setShowForm] = useState(false)
  const [editingCTA, setEditingCTA] = useState<HomepageCTA | null>(null)
  const [formData, setFormData] = useState({
    label: '',
    href: '',
    variant: 'bordered' as 'primary' | 'bordered',
    is_visible: true,
    display_order: 0,
  })
  const { toast } = useToast()

  const loadCTAs = async () => {
    try {
      const response = await fetch('/api/admin/homepage-ctas')
      const data = await response.json()
      
      if (data.success) {
        setCTAs(data.ctas || [])
      }
    } catch (error) {
      console.error('Error loading CTAs:', error)
    }
  }

  useEffect(() => {
    loadCTAs()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.label.trim()) {
      toast({
        title: "Error",
        description: "CTA label is required",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.href.trim()) {
      toast({
        title: "Error",
        description: "CTA link is required",
        variant: "destructive",
      })
      return
    }
    
    try {
      const url = editingCTA ? `/api/admin/homepage-ctas/${editingCTA.id}` : '/api/admin/homepage-ctas'
      const method = editingCTA ? 'PUT' : 'POST'
      
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
          description: editingCTA ? "CTA updated successfully" : "CTA added successfully",
        })
        setShowForm(false)
        setEditingCTA(null)
        setFormData({ label: '', href: '', variant: 'bordered', is_visible: true, display_order: 0 })
        loadCTAs()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save CTA",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving CTA:', error)
      toast({
        title: "Error",
        description: "Failed to save CTA",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (cta: HomepageCTA) => {
    setEditingCTA(cta)
    setFormData({
      label: cta.label,
      href: cta.href,
      variant: cta.variant,
      is_visible: cta.is_visible,
      display_order: cta.display_order,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this CTA button?')) return
    
    try {
      const response = await fetch(`/api/admin/homepage-ctas/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "CTA deleted successfully",
        })
        loadCTAs()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete CTA",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting CTA:', error)
      toast({
        title: "Error",
        description: "Failed to delete CTA",
        variant: "destructive",
      })
    }
  }

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const cta = ctas.find(c => c.id === id)
    if (!cta) return

    const currentIndex = ctas.findIndex(c => c.id === id)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= ctas.length) return

    const newOrder = ctas[newIndex].display_order
    const otherOrder = cta.display_order

    // Swap display orders
    try {
      await Promise.all([
        fetch(`/api/admin/homepage-ctas/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: newOrder }),
        }),
        fetch(`/api/admin/homepage-ctas/${ctas[newIndex].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: otherOrder }),
        }),
      ])
      loadCTAs()
    } catch (error) {
      console.error('Error moving CTA:', error)
      toast({
        title: "Error",
        description: "Failed to reorder CTA",
        variant: "destructive",
      })
    }
  }

  const handleToggleVisibility = async (cta: HomepageCTA) => {
    try {
      const response = await fetch(`/api/admin/homepage-ctas/${cta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: !cta.is_visible }),
      })

      const data = await response.json()
      
      if (data.success) {
        loadCTAs()
      } else {
        toast({
          title: "Error",
          description: "Failed to update visibility",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error toggling visibility:', error)
      toast({
        title: "Error",
        description: "Failed to update visibility",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gold-800">Homepage CTAs</h1>
            <p className="text-gold-600">Customize your homepage call-to-action buttons</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add CTA Button
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingCTA ? 'Edit CTA Button' : 'Add New CTA Button'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="label">Button Label *</Label>
                <Input
                  id="label"
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., RSVP, Schedule, Seating"
                  required
                />
              </div>
              <div>
                <Label htmlFor="href">Link/URL *</Label>
                <Input
                  id="href"
                  type="text"
                  value={formData.href}
                  onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                  placeholder="e.g., /rsvp, /schedule, /seating"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="variant">Button Style</Label>
                <select
                  id="variant"
                  value={formData.variant}
                  onChange={(e) => setFormData({ ...formData, variant: e.target.value as 'primary' | 'bordered' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="bordered">Bordered</option>
                  <option value="primary">Primary</option>
                </select>
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
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_visible}
                    onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Visible</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {editingCTA ? 'Update CTA' : 'Add CTA'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setEditingCTA(null)
                  setFormData({ label: '', href: '', variant: 'bordered', is_visible: true, display_order: 0 })
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {ctas.length === 0 ? (
        <Card className="text-center p-12">
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No CTAs Yet</h3>
          <p className="text-gray-500 mb-4">Add CTA buttons to customize your homepage</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First CTA
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {ctas.map((cta, index) => (
            <Card key={cta.id} className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMove(cta.id, 'up')}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMove(cta.id, 'down')}
                      disabled={index === ctas.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      ↓
                    </Button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{cta.label}</h3>
                      {!cta.is_visible && (
                        <span className="text-xs text-gray-500">(Hidden)</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{cta.href}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Style: {cta.variant}</span>
                      <span>Order: {cta.display_order}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleVisibility(cta)}
                    title={cta.is_visible ? 'Hide' : 'Show'}
                  >
                    {cta.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(cta)}
                  >
                    <Edit className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(cta.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-2" />
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

