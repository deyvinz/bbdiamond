'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Check, X, Trash2, Heart } from 'lucide-react'
import Link from 'next/link'
import type { GuestNote } from '@/lib/guest-notes-service'

interface GuestNotesAdminClientProps {
  initialNotes: GuestNote[]
}

export default function GuestNotesAdminClient({ initialNotes }: GuestNotesAdminClientProps) {
  const [notes, setNotes] = useState<GuestNote[]>(initialNotes)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  const loadNotes = async () => {
    try {
      const response = await fetch('/api/admin/guest-notes')
      const data = await response.json()
      if (data.success) {
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  useEffect(() => {
    loadNotes()
  }, [])

  const handleApprove = async (id: string) => {
    setLoading(prev => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`/api/admin/guest-notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: true }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "✅ Approved",
          description: "Guest note has been approved and is now visible.",
        })
        loadNotes()
      } else {
        throw new Error(data.error || 'Failed to approve note')
      }
    } catch (error) {
      console.error('Error approving note:', error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Failed to approve note",
        variant: "destructive",
      })
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleReject = async (id: string) => {
    setLoading(prev => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`/api/admin/guest-notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: false }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Note Rejected",
          description: "Guest note has been rejected and is no longer visible.",
        })
        loadNotes()
      } else {
        throw new Error(data.error || 'Failed to reject note')
      }
    } catch (error) {
      console.error('Error rejecting note:', error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Failed to reject note",
        variant: "destructive",
      })
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) return

    setLoading(prev => ({ ...prev, [id]: true }))
    try {
      const response = await fetch(`/api/admin/guest-notes/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "✅ Deleted",
          description: "Guest note has been deleted.",
        })
        loadNotes()
      } else {
        throw new Error(data.error || 'Failed to delete note')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Failed to delete note",
        variant: "destructive",
      })
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  const pendingNotes = notes.filter(n => !n.is_approved)
  const approvedNotes = notes.filter(n => n.is_approved)

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
            <h1 className="text-2xl lg:text-3xl font-bold text-gold-800">Guest Notes Moderation</h1>
            <p className="text-gold-600">Review and approve guest notes and well wishes</p>
          </div>
        </div>
      </div>

      {/* Pending Notes */}
      {pendingNotes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Pending Review ({pendingNotes.length})
          </h2>
          <div className="space-y-4">
            {pendingNotes.map((note) => (
              <Card key={note.id} className="border-yellow-200 bg-yellow-50/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Heart className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      {note.guest_name && (
                        <p className="font-semibold text-gray-900 mb-2">{note.guest_name}</p>
                      )}
                      {!note.guest_name && (
                        <p className="text-sm text-gray-500 mb-2 italic">Anonymous</p>
                      )}
                      <p className="text-gray-700 whitespace-pre-wrap mb-4">{note.message}</p>
                      <p className="text-xs text-gray-500 mb-4">
                        Submitted: {new Date(note.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(note.id)}
                          disabled={loading[note.id]}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(note.id)}
                          disabled={loading[note.id]}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(note.id)}
                          disabled={loading[note.id]}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved Notes */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Approved Notes ({approvedNotes.length})
        </h2>
        {approvedNotes.length > 0 ? (
          <div className="space-y-4">
            {approvedNotes.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <Heart className="h-5 w-5 text-gold-500 fill-gold-500" />
                    </div>
                    <div className="flex-1">
                      {note.guest_name && (
                        <p className="font-semibold text-gold-700 mb-2">{note.guest_name}</p>
                      )}
                      {!note.guest_name && (
                        <p className="text-sm text-gray-500 mb-2 italic">Anonymous</p>
                      )}
                      <p className="text-gray-700 whitespace-pre-wrap mb-4">{note.message}</p>
                      <p className="text-xs text-gray-500 mb-4">
                        {new Date(note.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(note.id)}
                          disabled={loading[note.id]}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Unapprove
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(note.id)}
                          disabled={loading[note.id]}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No approved notes yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

