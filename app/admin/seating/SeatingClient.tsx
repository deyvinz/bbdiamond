'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Plus, 
  Users, 
  MapPin, 
  Calendar, 
  Search,
  Filter,
  Edit,
  Trash2,
  UserPlus,
  UserMinus
} from 'lucide-react'
import type { SeatingTable, Seat } from '@/lib/types/seating'

interface Event {
  id: string
  name: string
  starts_at: string
  venue: string
  address?: string
}

interface Guest {
  id: string
  first_name: string
  last_name: string
  email: string
  invite_code: string
}

export default function SeatingClient() {
  const [tables, setTables] = useState<SeatingTable[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateTable, setShowCreateTable] = useState(false)
  const [showAssignSeat, setShowAssignSeat] = useState(false)
  const [selectedTable, setSelectedTable] = useState<SeatingTable | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<string>('')
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<number>(1)
  const [guestSearchTerm, setGuestSearchTerm] = useState<string>('')
  const [showGuestDropdown, setShowGuestDropdown] = useState<boolean>(false)
  const [newTable, setNewTable] = useState({ name: '', capacity: 8 })
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Filter tables by selected event
  useEffect(() => {
    if (selectedEvent) {
      loadTables(selectedEvent)
    }
  }, [selectedEvent])

  const loadData = async () => {
    setLoading(true)
    try {
      const [eventsRes, guestsRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/guests?pageSize=1000') // Fetch all guests
      ])
      
      const eventsData = await eventsRes.json()
      const guestsData = await guestsRes.json()
      
      // Handle new events API response format
      if (eventsData.success && eventsData.events) {
        setEvents(eventsData.events)
        if (eventsData.events.length > 0) {
          setSelectedEvent(eventsData.events[0].id)
        }
      } else {
        console.error('Failed to load events:', eventsData.error || 'Unknown error')
      }
      
      setGuests(guestsData.guests || guestsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTables = async (eventId: string) => {
    try {
      const response = await fetch(`/api/admin/seating/tables?event_id=${eventId}`)
      const data = await response.json()
      
      if (data.success) {
        setTables(data.tables)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error loading tables:', error)
      toast({
        title: "Error",
        description: "Failed to load tables. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCreateTable = async () => {
    if (!selectedEvent || !newTable.name || !newTable.capacity) {
      toast({
        title: "Error",
        description: "Please fill in all table details.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/admin/seating/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEvent,
          name: newTable.name,
          capacity: newTable.capacity
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Table created successfully!",
        })
        setNewTable({ name: '', capacity: 8 })
        setShowCreateTable(false)
        loadTables(selectedEvent)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error creating table:', error)
      toast({
        title: "Error",
        description: "Failed to create table. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAssignSeat = async () => {
    if (!selectedTable || !selectedGuest || !selectedSeatNumber) {
      toast({
        title: "Error",
        description: "Please select a table, guest, and seat number.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/admin/seating/assign-seat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTable.id,
          guest_id: selectedGuest,
          seat_number: selectedSeatNumber
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Seat assigned successfully!",
        })
        setShowAssignSeat(false)
        setSelectedGuest('')
        setSelectedSeatNumber(1)
        loadTables(selectedEvent)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error assigning seat:', error)
      toast({
        title: "Error",
        description: "Failed to assign seat. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveSeat = async (seatId: string) => {
    try {
      const response = await fetch(`/api/admin/seating/seats/${seatId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Seat assignment removed!",
        })
        loadTables(selectedEvent)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error removing seat:', error)
      toast({
        title: "Error",
        description: "Failed to remove seat assignment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredTables = tables.filter(table => 
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Filter guests based on search term
  const filteredGuests = guests.filter(guest => {
    const searchLower = guestSearchTerm.toLowerCase()
    return (
      guest.first_name.toLowerCase().includes(searchLower) ||
      guest.last_name.toLowerCase().includes(searchLower) ||
      guest.email.toLowerCase().includes(searchLower) ||
      guest.invite_code.toLowerCase().includes(searchLower)
    )
  })
  
  // Get selected guest data
  const selectedGuestData = guests.find(g => g.id === selectedGuest)

  const selectedEventData = events.find(e => e.id === selectedEvent)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Seating Management</h1>
          <p className="text-gray-600 mt-1">
            Manage table layouts and seat assignments for your wedding events
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => window.open('/admin/seating/chart', '_blank')}
            variant="outline"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Visual Chart
          </Button>
          <Button
            onClick={() => setShowCreateTable(true)}
            className="bg-gold-600 text-white hover:bg-gold-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Table
          </Button>
        </div>
      </div>

      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
          <CardDescription>
            Choose an event to manage its seating arrangements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="event-select">Event</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {new Date(event.starts_at).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedEventData && (
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{selectedEventData.venue}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Tables</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by table name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAssignSeat(true)}
                disabled={!selectedEvent}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Seat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tables Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTables.map((table) => (
          <Card key={table.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{table.name}</CardTitle>
                <Badge variant="outline">
                  {table.capacity} seats
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>
                      {table.seats?.filter(seat => seat.guest_id).length || 0} / {table.capacity} assigned
                    </span>
                  </div>
                </div>
                
                {/* Seat Assignments */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Seat Assignments</h4>
                  {table.seats?.length ? (
                    <div className="space-y-1">
                      {table.seats
                        .filter(seat => seat.guest_id)
                        .sort((a, b) => a.seat_number - b.seat_number)
                        .map((seat) => (
                        <div key={seat.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <div>
                            <span className="font-medium">Seat {seat.seat_number}:</span>
                            <span className="ml-2">
                              {seat.guest?.first_name} {seat.guest?.last_name}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveSeat(seat.id)}
                          >
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No seats assigned</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tables Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No tables match your search.' : 'No tables created for this event yet.'}
            </p>
            <Button
              onClick={() => setShowCreateTable(true)}
              className="bg-gold-600 text-white hover:bg-gold-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Table
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Table Dialog */}
      <Dialog open={showCreateTable} onOpenChange={setShowCreateTable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
            <DialogDescription>
              Add a new table for the selected event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="table-name">Table Name</Label>
              <Input
                id="table-name"
                placeholder="e.g., Table 1, VIP Table"
                value={newTable.name}
                onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="table-capacity">Capacity</Label>
              <Input
                id="table-capacity"
                type="number"
                min="1"
                max="20"
                value={newTable.capacity}
                onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 8 })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateTable(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTable} className="bg-gold-600 text-white hover:bg-gold-700">
                Create Table
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Seat Dialog */}
      <Dialog open={showAssignSeat} onOpenChange={setShowAssignSeat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Seat</DialogTitle>
            <DialogDescription>
              Assign a guest to a specific seat at a table.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="table-select">Table</Label>
              <Select onValueChange={(value) => {
                const table = tables.find(t => t.id === value)
                setSelectedTable(table || null)
                // Reset seat number when table changes
                setSelectedSeatNumber(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name} ({table.capacity} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="guest-select">Guest</Label>
              <div className="relative">
                <Input
                  id="guest-select"
                  placeholder="Search for a guest..."
                  value={guestSearchTerm}
                  onChange={(e) => {
                    setGuestSearchTerm(e.target.value)
                    setShowGuestDropdown(true)
                  }}
                  onFocus={() => setShowGuestDropdown(true)}
                  onBlur={() => {
                    // Delay hiding to allow clicking on dropdown items
                    setTimeout(() => setShowGuestDropdown(false), 200)
                  }}
                />
                {showGuestDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredGuests.length > 0 ? (
                      filteredGuests.map((guest) => (
                        <div
                          key={guest.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            setSelectedGuest(guest.id)
                            setGuestSearchTerm(`${guest.first_name} ${guest.last_name}`)
                            setShowGuestDropdown(false)
                          }}
                        >
                          <div className="font-medium text-sm">
                            {guest.first_name} {guest.last_name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {guest.email} • {guest.invite_code}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        No guests found matching "{guestSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedGuestData && (
                <p className="text-xs text-gray-600 mt-1">
                  Selected: {selectedGuestData.first_name} {selectedGuestData.last_name} ({selectedGuestData.invite_code})
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="seat-number">Seat Number</Label>
              <Input
                id="seat-number"
                type="number"
                min="1"
                max={selectedTable?.capacity || 20}
                value={selectedSeatNumber}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1
                  const maxSeats = selectedTable?.capacity || 20
                  // Ensure the value is within the table's capacity
                  const clampedValue = Math.min(Math.max(value, 1), maxSeats)
                  setSelectedSeatNumber(clampedValue)
                }}
                placeholder={`1-${selectedTable?.capacity || 20}`}
              />
              {selectedTable && (
                <p className="text-xs text-gray-600 mt-1">
                  Table "{selectedTable.name}" has {selectedTable.capacity} seats (1-{selectedTable.capacity})
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowAssignSeat(false)
                setSelectedGuest('')
                setGuestSearchTerm('')
                setSelectedSeatNumber(1)
                setSelectedTable(null)
              }}>
                Cancel
              </Button>
              <Button onClick={handleAssignSeat} className="bg-gold-600 text-white hover:bg-gold-700">
                Assign Seat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
