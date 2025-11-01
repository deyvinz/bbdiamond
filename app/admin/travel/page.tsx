'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Plus, Edit, Trash2, Plane, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

interface TravelSection {
  id: string
  section_type: string
  title: string
  description?: string | null
  display_order: number
}

interface TravelItem {
  id: string
  section_id: string
  name: string
  description?: string | null
  address?: string | null
  phone?: string | null
  website?: string | null
  details?: string[] | null
  tips?: string[] | null
  display_order: number
}

export default function TravelAdminPage() {
  const [sections, setSections] = useState<TravelSection[]>([])
  const [items, setItems] = useState<TravelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showSectionForm, setShowSectionForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingSection, setEditingSection] = useState<TravelSection | null>(null)
  const [editingItem, setEditingItem] = useState<TravelItem | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [sectionFormData, setSectionFormData] = useState({
    section_type: '',
    title: '',
    description: '',
    display_order: 0
  })
  const [itemFormData, setItemFormData] = useState({
    section_id: '',
    name: '',
    description: '',
    address: '',
    phone: '',
    website: '',
    details: '',
    tips: '',
    display_order: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [sectionsRes, itemsRes] = await Promise.all([
        fetch('/api/admin/travel/sections'),
        fetch('/api/admin/travel/items')
      ])
      
      const sectionsData = await sectionsRes.json()
      const itemsData = await itemsRes.json()
      
      if (sectionsData.success) {
        setSections(sectionsData.sections)
        // Expand all sections by default
        setExpandedSections(new Set(sectionsData.sections.map((s: TravelSection) => s.id)))
      }
      
      if (itemsData.success) {
        setItems(itemsData.items)
      }
    } catch (error) {
      console.error('Error loading travel data:', error)
      toast({
        title: "Error",
        description: "Failed to load travel data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingSection ? `/api/admin/travel/sections/${editingSection.id}` : '/api/admin/travel/sections'
      const method = editingSection ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sectionFormData),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: editingSection ? "Section updated successfully" : "Section added successfully",
        })
        setShowSectionForm(false)
        setEditingSection(null)
        setSectionFormData({ section_type: '', title: '', description: '', display_order: 0 })
        loadData()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save section",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving section:', error)
      toast({
        title: "Error",
        description: "Failed to save section",
        variant: "destructive",
      })
    }
  }

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const details = itemFormData.details ? itemFormData.details.split('\n').filter(d => d.trim()) : []
      const tips = itemFormData.tips ? itemFormData.tips.split('\n').filter(t => t.trim()) : []
      
      const url = editingItem ? `/api/admin/travel/items/${editingItem.id}` : '/api/admin/travel/items'
      const method = editingItem ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...itemFormData,
          details: details.length > 0 ? details : null,
          tips: tips.length > 0 ? tips : null
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: editingItem ? "Item updated successfully" : "Item added successfully",
        })
        setShowItemForm(false)
        setEditingItem(null)
        setItemFormData({ section_id: '', name: '', description: '', address: '', phone: '', website: '', details: '', tips: '', display_order: 0 })
        loadData()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving item:', error)
      toast({
        title: "Error",
        description: "Failed to save item",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section? All items in this section will also be deleted.')) return
    
    try {
      const response = await fetch(`/api/admin/travel/sections/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Section deleted successfully",
        })
        loadData()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete section",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting section:', error)
      toast({
        title: "Error",
        description: "Failed to delete section",
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      const response = await fetch(`/api/admin/travel/items/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Item deleted successfully",
        })
        loadData()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete item",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const handleEditSection = (section: TravelSection) => {
    setEditingSection(section)
    setSectionFormData({
      section_type: section.section_type,
      title: section.title,
      description: section.description || '',
      display_order: section.display_order
    })
    setShowSectionForm(true)
  }

  const handleEditItem = (item: TravelItem) => {
    setEditingItem(item)
    setItemFormData({
      section_id: item.section_id,
      name: item.name,
      description: item.description || '',
      address: item.address || '',
      phone: item.phone || '',
      website: item.website || '',
      details: Array.isArray(item.details) ? item.details.join('\n') : '',
      tips: Array.isArray(item.tips) ? item.tips.join('\n') : '',
      display_order: item.display_order
    })
    setShowItemForm(true)
  }

  const getSectionItems = (sectionId: string) => {
    return items.filter(item => item.section_id === sectionId)
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading travel information...</div>
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
            <h1 className="text-2xl lg:text-3xl font-bold text-gold-800">Travel Management</h1>
            <p className="text-gold-600">Manage travel sections and items</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setShowSectionForm(true)
            setEditingSection(null)
            setSectionFormData({ section_type: '', title: '', description: '', display_order: 0 })
          }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>

      {/* Section Form */}
      {showSectionForm && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingSection ? 'Edit Travel Section' : 'Add New Travel Section'}
          </h2>
          <form onSubmit={handleSectionSubmit} className="space-y-4">
            <div>
              <Label htmlFor="section_type">Section Type *</Label>
              <Select
                value={sectionFormData.section_type}
                onValueChange={(value) => setSectionFormData({ ...sectionFormData, section_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="local-info">Local Information</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                type="text"
                value={sectionFormData.title}
                onChange={(e) => setSectionFormData({ ...sectionFormData, title: e.target.value })}
                placeholder="Enter section title"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={sectionFormData.description}
                onChange={(e) => setSectionFormData({ ...sectionFormData, description: e.target.value })}
                placeholder="Enter section description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={sectionFormData.display_order}
                onChange={(e) => setSectionFormData({ ...sectionFormData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 sm:flex-none">
                {editingSection ? 'Update Section' : 'Add Section'}
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowSectionForm(false)
                setEditingSection(null)
                setSectionFormData({ section_type: '', title: '', description: '', display_order: 0 })
              }} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Item Form */}
      {showItemForm && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingItem ? 'Edit Travel Item' : 'Add New Travel Item'}
          </h2>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <div>
              <Label htmlFor="section_id">Section *</Label>
              <Select
                value={itemFormData.section_id}
                onValueChange={(value) => setItemFormData({ ...itemFormData, section_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>{section.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                type="text"
                value={itemFormData.name}
                onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                placeholder="Enter item name"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={itemFormData.description}
                onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                placeholder="Enter item description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                type="text"
                value={itemFormData.address}
                onChange={(e) => setItemFormData({ ...itemFormData, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="text"
                value={itemFormData.phone}
                onChange={(e) => setItemFormData({ ...itemFormData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={itemFormData.website}
                onChange={(e) => setItemFormData({ ...itemFormData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="details">Details (one per line)</Label>
              <Textarea
                id="details"
                value={itemFormData.details}
                onChange={(e) => setItemFormData({ ...itemFormData, details: e.target.value })}
                placeholder="Enter details, one per line"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="tips">Tips (one per line)</Label>
              <Textarea
                id="tips"
                value={itemFormData.tips}
                onChange={(e) => setItemFormData({ ...itemFormData, tips: e.target.value })}
                placeholder="Enter tips, one per line"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={itemFormData.display_order}
                onChange={(e) => setItemFormData({ ...itemFormData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 sm:flex-none">
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                setShowItemForm(false)
                setEditingItem(null)
                setItemFormData({ section_id: '', name: '', description: '', address: '', phone: '', website: '', details: '', tips: '', display_order: 0 })
              }} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Sections and Items */}
      {sections.length === 0 ? (
        <Card className="text-center p-12">
          <Plane className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Travel Sections Yet</h3>
          <p className="text-gray-500 mb-4">Add your first travel section to get started</p>
          <Button onClick={() => {
            setShowSectionForm(true)
            setEditingSection(null)
            setSectionFormData({ section_type: '', title: '', description: '', display_order: 0 })
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Section
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const sectionItems = getSectionItems(section.id)
            const isExpanded = expandedSections.has(section.id)
            
            return (
              <Card key={section.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="flex items-center gap-2 text-left"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <h3 className="font-semibold text-lg">{section.title}</h3>
                        <span className="text-xs text-gray-500">({sectionItems.length} items)</span>
                      </button>
                    </div>
                    {section.description && (
                      <p className="text-sm text-gray-600 mt-1 ml-6">{section.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setItemFormData({ section_id: section.id, name: '', description: '', address: '', phone: '', website: '', details: '', tips: '', display_order: 0 })
                        setEditingItem(null)
                        setShowItemForm(true)
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Item
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditSection(section)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSection(section.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="mt-4 space-y-3">
                    {sectionItems.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No items in this section</p>
                    ) : (
                      sectionItems.map((item) => (
                        <Card key={item.id} className="p-4 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{item.name}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                              {item.address && (
                                <p className="text-xs text-gray-500 mt-1">📍 {item.address}</p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditItem(item)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

