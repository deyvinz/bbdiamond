'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/Card'
import { Search, Users, UserCheck, Mail } from 'lucide-react'
import type { GuestSelection } from '@/lib/types/announcements'

interface GuestSelectionProps {
  selectedGuests: string[]
  onSelectionChange: (guestIds: string[]) => void
  sendToAll: boolean
  onSendToAllChange: (sendToAll: boolean) => void
}

export default function GuestSelection({ 
  selectedGuests, 
  onSelectionChange, 
  sendToAll, 
  onSendToAllChange 
}: GuestSelectionProps) {
  const [guests, setGuests] = useState<GuestSelection[]>([])
  const [filteredGuests, setFilteredGuests] = useState<GuestSelection[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedCount, setSelectedCount] = useState(0)

  useEffect(() => {
    loadGuests()
  }, [])

  useEffect(() => {
    // Filter guests based on search term
    if (!searchTerm.trim()) {
      setFilteredGuests(guests)
    } else {
      console.log('Searching for:', searchTerm, 'in', guests.length, 'guests')
      const filtered = guests.filter(guest => 
        guest.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.household?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      console.log('Filtered results:', filtered.length)
      setFilteredGuests(filtered)
    }
  }, [searchTerm, guests])

  useEffect(() => {
    setSelectedCount(selectedGuests.length)
  }, [selectedGuests])

  const loadGuests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/guests?pageSize=1000')
      const data = await response.json()
      
      // The guests API returns { guests: [...], total_count: ... }
      if (data.guests && Array.isArray(data.guests)) {
        console.log('Loaded guests:', data.guests.length)
        const guestsWithSelection = data.guests.map((guest: any) => ({
          ...guest,
          selected: selectedGuests.includes(guest.id)
        }))
        setGuests(guestsWithSelection)
        setFilteredGuests(guestsWithSelection)
      } else {
        console.error('Invalid guests data format:', data)
        setGuests([])
        setFilteredGuests([])
      }
    } catch (error) {
      console.error('Error loading guests:', error)
      setGuests([])
      setFilteredGuests([])
    } finally {
      setLoading(false)
    }
  }

  const handleGuestToggle = (guestId: string) => {
    if (sendToAll) {
      onSendToAllChange(false)
    }
    
    const newSelection = selectedGuests.includes(guestId)
      ? selectedGuests.filter(id => id !== guestId)
      : [...selectedGuests, guestId]
    
    onSelectionChange(newSelection)
  }

  const handleSelectAll = () => {
    if (sendToAll) {
      onSendToAllChange(false)
    }
    onSelectionChange(filteredGuests.map(guest => guest.id))
  }

  const handleDeselectAll = () => {
    onSelectionChange([])
  }

  const handleSendToAll = () => {
    onSendToAllChange(true)
    onSelectionChange([])
  }

  const guestsWithEmail = guests.filter(guest => guest.email && guest.email.trim() !== '')
  const selectedGuestsWithEmail = guestsWithEmail.filter(guest => selectedGuests.includes(guest.id))

  return (
    <div className="space-y-4">
      {/* Send to All Option */}
      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="send-to-all"
            checked={sendToAll}
            onCheckedChange={handleSendToAll}
          />
          <div className="flex-1">
            <label htmlFor="send-to-all" className="text-sm font-medium cursor-pointer">
              Send to all guests with email addresses
            </label>
            <p className="text-xs text-gray-500 mt-1">
              {guestsWithEmail.length} guests have email addresses
            </p>
          </div>
        </div>
      </Card>

      {!sendToAll && (
        <>
          {/* Search and Selection Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search guests by name, email, or household..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredGuests.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={selectedCount === 0}
              >
                Deselect All
              </Button>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center space-x-4 text-sm">
            <Badge variant="outline" className="flex items-center space-x-1">
              <UserCheck className="h-3 w-3" />
              <span>{selectedCount} selected</span>
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Mail className="h-3 w-3" />
              <span>{selectedGuestsWithEmail.length} with email</span>
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{filteredGuests.length} filtered</span>
            </Badge>
          </div>

          {/* Guest List */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Loading guests...
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm ? 'No guests found matching your search.' : 'No guests available.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredGuests.map((guest) => (
                  <div key={guest.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`guest-${guest.id}`}
                        checked={selectedGuests.includes(guest.id)}
                        onCheckedChange={() => handleGuestToggle(guest.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <label 
                            htmlFor={`guest-${guest.id}`}
                            className="text-sm font-medium cursor-pointer truncate"
                          >
                            {guest.first_name} {guest.last_name}
                          </label>
                          {guest.is_vip && (
                            <Badge variant="secondary" className="text-xs">
                              VIP
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span className={guest.email ? '' : 'text-red-500'}>
                              {guest.email || 'No email'}
                            </span>
                          </span>
                          {guest.household && (
                            <span className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>{guest.household.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
