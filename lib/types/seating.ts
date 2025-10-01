export interface SeatingTable {
  id: string
  event_id: string
  name: string
  capacity: number
  pos_x: number
  pos_y: number
  event?: {
    id: string
    name: string
    starts_at: string
    venue: string
    address?: string
  }
  seats?: Seat[]
}

export interface Seat {
  id: string
  table_id: string
  seat_number: number
  guest_id: string | null
  guest?: {
    id: string
    first_name: string
    last_name: string
    email: string
    is_vip: boolean
  }
  table?: {
    id: string
    name: string
    capacity: number
  }
}

export interface GuestSeatingInfo {
  guest: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  seats: Array<{
    id: string
    seat_number: number
    table: {
      id: string
      name: string
      capacity: number
    }
    event: {
      id: string
      name: string
      starts_at: string
      venue: string
      address?: string
    }
  }>
}
