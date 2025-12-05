'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Plus, Edit, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ImageUpload from '@/components/ImageUpload'

interface WeddingPartyMember {
  id: string
  name: string
  role: string
  image_url?: string | null
  bio?: string | null
  display_order: number
}

export default function WeddingPartyAdminPage() {
  const [members, setMembers] = useState<WeddingPartyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<WeddingPartyMember | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    image_url: '',
    bio: '',
    display_order: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/wedding-party')
      const data = await response.json()
      
      if (data.success) {
        setMembers(data.members)
      } else {
        toast({
          title: "Error",
          description: "Failed to load wedding party members",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading wedding party members:', error)
      toast({
        title: "Error",
        description: "Failed to load wedding party members",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingMember ? `/api/admin/wedding-party/${editingMember.id}` : '/api/admin/wedding-party'
      const method = editingMember ? 'PUT' : 'POST'
      
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
          description: editingMember ? "Wedding party member updated successfully" : "Wedding party member added successfully",
        })
        setShowForm(false)
        setEditingMember(null)
        setFormData({ name: '', role: '', image_url: '', bio: '', display_order: 0 })
        loadMembers()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save wedding party member",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving wedding party member:', error)
      toast({
        title: "Error",
        description: "Failed to save wedding party member",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (member: WeddingPartyMember) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      role: member.role,
      image_url: member.image_url || '',
      bio: member.bio || '',
      display_order: member.display_order
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this wedding party member?')) return
    
    try {
      const response = await fetch(`/api/admin/wedding-party/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Wedding party member deleted successfully",
        })
        loadMembers()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete wedding party member",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting wedding party member:', error)
      toast({
        title: "Error",
        description: "Failed to delete wedding party member",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingMember(null)
    setFormData({ name: '', role: '', image_url: '', bio: '', display_order: 0 })
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg">Loading wedding party members...</div>
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
            <h1 className="text-2xl lg:text-3xl font-bold text-gold-800">Wedding Party Management</h1>
            <p className="text-gold-600">Manage wedding party members</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingMember ? 'Edit Wedding Party Member' : 'Add New Wedding Party Member'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter member name"
                required
              />
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g., Maid of Honor, Best Man, Bridesmaid"
                required
              />
            </div>
            <div>
              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                label="Image"
                maxSize={5 * 1024 * 1024} // 5MB
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Optional biography"
                rows={3}
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
                Lower numbers appear first
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="flex-1 sm:flex-none">
                {editingMember ? 'Update Member' : 'Add Member'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Wedding Party Members */}
      {members.length === 0 ? (
        <Card className="text-center p-12">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Wedding Party Members Yet</h3>
          <p className="text-gray-500 mb-4">Add your first wedding party member to get started</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Member
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => {
            return (
              <Card key={member.id} className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    {member.image_url && member.image_url.trim() !== '' ? (
                      <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-gold-200 shadow-gold mx-auto">
                        <img
                          src={member.image_url}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Image failed to load for', member.name, ':', member.image_url)
                            // Hide the image and show fallback
                            const target = e.target as HTMLImageElement
                            if (target.parentElement) {
                              target.parentElement.style.display = 'none'
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <Avatar className="h-24 w-24">
                        <AvatarFallback className="text-xl font-semibold bg-[#C8A951]/10 text-[#C8A951]">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                <div className="space-y-1 mb-4">
                  <h3 className="font-semibold text-lg text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-600">{member.role}</p>
                  {member.bio && (
                    <p className="text-xs text-gray-500 mt-2">{member.bio}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Order: {member.display_order}</p>
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(member)}
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 sm:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(member.id)}
                    className="text-red-600 hover:text-red-700 flex-1"
                  >
                    <Trash2 className="w-3 h-3 sm:mr-2" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

