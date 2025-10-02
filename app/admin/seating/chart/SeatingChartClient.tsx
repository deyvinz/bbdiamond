'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Plus, 
  Users, 
  MapPin, 
  Calendar, 
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Move,
  UserPlus,
  UserMinus,
  AlertTriangle,
  ArrowLeft,
  Menu,
  X
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

interface TablePosition {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export default function SeatingChartClient() {
  const [tables, setTables] = useState<SeatingTable[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedGuest, setDraggedGuest] = useState<Guest | null>(null)
  const [showCreateTable, setShowCreateTable] = useState(false)
  const [newTable, setNewTable] = useState({ name: '', capacity: 8 })
  const [tablePositions, setTablePositions] = useState<Map<string, TablePosition>>(new Map())
  const [conflicts, setConflicts] = useState<string[]>([])
  const [showSidebar, setShowSidebar] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  // Load tables when event changes
  useEffect(() => {
    if (selectedEvent) {
      loadTables(selectedEvent)
    }
  }, [selectedEvent])

  // Initialize table positions
  useEffect(() => {
    if (tables.length > 0) {
      initializeTablePositions()
    }
  }, [tables])

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

  const initializeTablePositions = () => {
    const positions = new Map<string, TablePosition>()
    const tableWidth = 200
    const tableHeight = 150
    const spacing = 50
    const cols = Math.ceil(Math.sqrt(tables.length))
    
    tables.forEach((table, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      const x = col * (tableWidth + spacing) + 50
      const y = row * (tableHeight + spacing) + 50
      
      positions.set(table.id, {
        id: table.id,
        x: table.pos_x || x,
        y: table.pos_y || y,
        width: tableWidth,
        height: tableHeight
      })
    })
    
    setTablePositions(positions)
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

  const handleDragStart = (guest: Guest) => {
    setDraggedGuest(guest)
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDraggedGuest(null)
  }

  const handleTableDrop = async (e: React.DragEvent, tableId: string, seatNumber: number) => {
    e.preventDefault()
    
    console.log('handleTableDrop called for table:', tableId, 'seat:', seatNumber)
    
    // Try to get guest data from JSON first, then fallback to ID lookup
    let guest = null
    try {
      const guestJson = e.dataTransfer.getData('application/json')
      if (guestJson) {
        guest = JSON.parse(guestJson)
        console.log('Guest data from JSON:', guest)
      }
    } catch (error) {
      console.log('Failed to parse guest JSON, trying ID lookup')
    }
    
    // Fallback to ID lookup
    if (!guest) {
      const guestId = e.dataTransfer.getData('text/plain')
      console.log('Guest ID from text:', guestId)
      if (!guestId) {
        console.error('No guest data found in drag transfer')
        return
      }
      guest = guests.find(g => g.id === guestId)
    }
    
    if (!guest) {
      console.error('Guest not found:', guest)
      return
    }

    console.log('Assigning guest:', guest.first_name, guest.last_name, 'to seat:', seatNumber)

    try {
      const response = await fetch('/api/admin/seating/assign-seat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId,
          guest_id: guest.id,
          seat_number: seatNumber
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: `${guest.first_name} ${guest.last_name} assigned to seat ${seatNumber}!`,
        })
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

  const handleTableMove = (tableId: string, newX: number, newY: number) => {
    const newPositions = new Map(tablePositions)
    const position = newPositions.get(tableId)
    if (position) {
      newPositions.set(tableId, { ...position, x: newX, y: newY })
      setTablePositions(newPositions)
    }
  }

  const saveTablePositions = async () => {
    try {
      const updates = Array.from(tablePositions.entries()).map(([tableId, position]) => ({
        id: tableId,
        pos_x: position.x,
        pos_y: position.y
      }))

      const response = await fetch('/api/admin/seating/tables/positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Table positions saved!",
        })
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error saving positions:', error)
      toast({
        title: "Error",
        description: "Failed to save table positions. Please try again.",
        variant: "destructive",
      })
    }
  }

  const selectedEventData = events.find(e => e.id === selectedEvent)
  const unassignedGuests = guests.filter(guest => 
    !tables.some(table => 
      table.seats?.some(seat => seat.guest_id === guest.id)
    )
  )

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
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Mobile Header */}
      <div className="lg:hidden p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Guest List
          </Button>
        </div>
        <div className="mt-4">
          <h1 className="text-xl font-serif">Visual Seating Chart</h1>
          <p className="text-sm text-gray-600">
            Drag guests to assign seats visually
          </p>
        </div>
      </div>

      {/* Guest List Sidebar */}
      <div className={`${showSidebar ? 'block' : 'hidden'} lg:block w-full lg:w-1/3 border-r bg-gray-50 flex flex-col`}>
        <div className="p-4 border-b bg-white">
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold mb-2">Guest List</h2>
            <p className="text-sm text-gray-600 mb-4">
              Drag guests to assign them to seats. {unassignedGuests.length} guests are unassigned.
            </p>
          </div>
          <div className="space-y-3">
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="w-full">
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
            {selectedEventData && (
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{selectedEventData.venue}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {guests.map((guest) => {
              const isAssigned = !unassignedGuests.includes(guest)
              return (
                <div
                  key={guest.id}
                  className={`
                    p-3 border rounded-lg transition-colors min-h-[80px] flex flex-col
                    ${isAssigned 
                      ? 'bg-green-50 border-green-200 text-green-800 cursor-default' 
                      : 'bg-white border-gray-200 hover:bg-gold-50 hover:border-gold-300 cursor-move'
                    }
                    ${isDragging ? 'opacity-50' : ''}
                  `}
                  draggable={!isAssigned}
                  onDragStart={(e) => {
                    if (!isAssigned) {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', guest.id)
                      e.dataTransfer.setData('application/json', JSON.stringify(guest))
                      handleDragStart(guest)
                      console.log('Drag started for guest:', guest.first_name, guest.last_name)
                    }
                  }}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1 leading-tight">
                        {guest.first_name} {guest.last_name}
                      </div>
                      <div className="text-xs text-gray-600 font-mono">
                        {guest.invite_code}
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                      {isAssigned ? (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs px-2 py-1">
                          Assigned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs px-2 py-1">
                          Unassigned
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Seating Chart Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Desktop Header */}
        <div className="hidden lg:block p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-serif">Visual Seating Chart</h1>
                <p className="text-gray-600 mt-1">
                  Drag guests from the sidebar to assign seats visually
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={saveTablePositions}
                className="bg-gold-600 text-white hover:bg-gold-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Layout
              </Button>
              <Button
                onClick={() => setShowCreateTable(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Table
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="lg:hidden p-4 border-b bg-white">
          <div className="flex gap-2">
            <Button
              onClick={saveTablePositions}
              className="bg-gold-600 text-white hover:bg-gold-700 flex-1"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Layout
            </Button>
            <Button
              onClick={() => setShowCreateTable(true)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-2 lg:p-4">
          <div 
            ref={canvasRef}
            className="relative h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
            style={{ position: 'relative' }}
          >
            {tables.map((table) => {
              const position = tablePositions.get(table.id)
              if (!position) return null

              return (
                <div
                  key={table.id}
                  className="absolute bg-white border-2 border-gold-300 rounded-lg shadow-lg cursor-move"
                  style={{
                    left: position.x,
                    top: position.y,
                    width: position.width,
                    height: position.height,
                    zIndex: isDragging ? 10 : 1
                  }}
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                      // Handle table dragging
                      const startX = e.clientX - position.x
                      const startY = e.clientY - position.y
                      
                      const handleMouseMove = (e: MouseEvent) => {
                        const newX = e.clientX - startX
                        const newY = e.clientY - startY
                        handleTableMove(table.id, Math.max(0, newX), Math.max(0, newY))
                      }
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove)
                        document.removeEventListener('mouseup', handleMouseUp)
                      }
                      
                      document.addEventListener('mousemove', handleMouseMove)
                      document.addEventListener('mouseup', handleMouseUp)
                    }
                  }}
                >
                  {/* Table Header */}
                  <div className="p-2 lg:p-3 border-b border-gold-200 bg-gold-50 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-xs lg:text-sm">{table.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {table.capacity} seats
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Seats Grid */}
                  <div className="p-2 lg:p-3">
                    <div className="grid grid-cols-4 gap-1 lg:gap-2">
                      {Array.from({ length: table.capacity }, (_, index) => {
                        const seatNumber = index + 1
                        const seat = table.seats?.find(s => s.seat_number === seatNumber)
                        const isOccupied = seat && seat.guest_id
                        
                        return (
                          <div
                            key={seatNumber}
                            className={`
                              w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-colors
                              ${isOccupied 
                                ? 'bg-gold-200 border-gold-400 text-gold-800' 
                                : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gold-100 hover:border-gold-300'
                              }
                              ${isDragging ? 'hover:bg-gold-300' : ''}
                            `}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              if (!isOccupied) {
                                e.currentTarget.classList.add('bg-gold-300', 'border-gold-500')
                              }
                            }}
                            onDragLeave={(e) => {
                              if (!isOccupied) {
                                e.currentTarget.classList.remove('bg-gold-300', 'border-gold-500')
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              console.log('Drop event triggered on seat:', seatNumber)
                              if (!isOccupied) {
                                e.currentTarget.classList.remove('bg-gold-300', 'border-gold-500')
                                handleTableDrop(e, table.id, seatNumber)
                              }
                            }}
                            title={isOccupied ? `${seat.guest?.first_name} ${seat.guest?.last_name}` : `Seat ${seatNumber}`}
                          >
                            {isOccupied ? (
                              <div className="flex items-center justify-center">
                                <UserMinus 
                                  className="h-2 w-2 lg:h-3 lg:w-3 text-gold-600 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (seat.id) handleRemoveSeat(seat.id)
                                  }}
                                />
                              </div>
                            ) : (
                              seatNumber
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Tables Created</h3>
                  <p className="text-gray-600 mb-4">
                    Create tables to start building your seating chart.
                  </p>
                  <Button
                    onClick={() => setShowCreateTable(true)}
                    className="bg-gold-600 text-white hover:bg-gold-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Table
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Table Dialog */}
      <Dialog open={showCreateTable} onOpenChange={setShowCreateTable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
            <DialogDescription>
              Add a new table to the seating chart.
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

    </div>
  )
}
