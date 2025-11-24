'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import Section from '@/components/Section'
import { Heart, Send, Loader2 } from 'lucide-react'
import type { GuestNote } from '@/lib/guest-notes-service'

interface GuestNotesClientProps {
  initialNotes: GuestNote[]
  coupleName: string
}

export default function GuestNotesClient({ initialNotes, coupleName }: GuestNotesClientProps) {
  const [notes, setNotes] = useState<GuestNote[]>(initialNotes)
  const [formData, setFormData] = useState({
    guest_name: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter your note or well wish.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/guest-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✅ Thank You!",
          description: "Your note has been submitted and will be reviewed before being published.",
        })
        setFormData({ guest_name: '', message: '' })
        // Reload notes to show the new one if it was auto-approved
        const notesResponse = await fetch('/api/guest-notes')
        const notesData = await notesResponse.json()
        if (notesData.success) {
          setNotes(notesData.notes)
        }
      } else {
        throw new Error(data.error || 'Failed to submit note')
      }
    } catch (error) {
      console.error('Error submitting note:', error)
      toast({
        title: "❌ Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit your note. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Section title="Well Wishes & Memories" subtitle={`Share your thoughts and memories about ${coupleName}`}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Submission Form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="guest_name">Your Name (Optional)</Label>
                <Input
                  id="guest_name"
                  type="text"
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  placeholder="Leave blank to submit anonymously"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label htmlFor="message">Your Note or Well Wish *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Share a memory, well wish, or message for the couple..."
                  rows={5}
                  required
                  disabled={submitting}
                  className="resize-none"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Note
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Display Approved Notes */}
        {notes.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-center mb-6">
              Messages from Guests
            </h2>
            {notes.map((note) => (
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
                      <p className="text-gray-700 whitespace-pre-wrap">{note.message}</p>
                      <p className="text-xs text-gray-500 mt-3">
                        {new Date(note.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
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
              <p className="text-gray-600">No messages yet. Be the first to share your well wishes!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Section>
  )
}

