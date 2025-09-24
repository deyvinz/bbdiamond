import { supabaseServer } from './supabase-server'
import { bumpNamespaceVersion, cacheJson } from './cache'
import { eventsListKey, eventDetailKey } from './cache-keys'
import { 
  createEventSchema, 
  updateEventSchema,
  type CreateEventInput,
  type UpdateEventInput
} from './validators'
import { logAdminAction } from './audit'

export interface Event {
  id: string
  name: string
  venue: string
  address?: string
  starts_at: string
  created_at: string
  updated_at: string
}

export interface EventsListResponse {
  events: Event[]
  total_count: number
}

export async function getEventsPage(): Promise<EventsListResponse> {
  const cacheKey = eventsListKey()
  
  return await cacheJson(cacheKey, 120, async () => {
    const supabase = await supabaseServer()
    
    const { data: events, error, count } = await supabase
      .from('events')
      .select('*', { count: 'exact' })
      .order('starts_at', { ascending: true })

    if (error) {
      console.error('Events query error:', error)
      throw new Error(`Failed to fetch events: ${error.message}`)
    }

    return {
      events: events || [],
      total_count: count || 0
    }
  })
}

export async function getEventById(eventId: string): Promise<Event> {
  const cacheKey = eventDetailKey(eventId)
  
  return await cacheJson(cacheKey, 120, async () => {
    const supabase = await supabaseServer()
    
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) {
      console.error('Event query error:', error)
      throw new Error(`Failed to fetch event: ${error.message}`)
    }

    if (!event) {
      throw new Error('Event not found')
    }

    return event
  })
}

export async function createEvent(eventData: CreateEventInput): Promise<Event> {
  const supabase = await supabaseServer()
  
  // Validate input
  const validatedData = createEventSchema.parse(eventData)
  
  const { data: event, error } = await supabase
    .from('events')
    .insert([validatedData])
    .select()
    .single()

  if (error) {
    console.error('Event creation error:', error)
    throw new Error(`Failed to create event: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('event_create', {
    event_id: event.id,
    event_name: event.name
  })

  return event
}

export async function updateEvent(eventId: string, eventData: UpdateEventInput): Promise<Event> {
  const supabase = await supabaseServer()
  
  // Validate input
  const validatedData = updateEventSchema.parse(eventData)
  
  const { data: event, error } = await supabase
    .from('events')
    .update(validatedData)
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    console.error('Event update error:', error)
    throw new Error(`Failed to update event: ${error.message}`)
  }

  if (!event) {
    throw new Error('Event not found')
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('event_update', {
    event_id: eventId,
    updates: validatedData
  })

  return event
}

export async function deleteEvent(eventId: string): Promise<void> {
  const supabase = await supabaseServer()
  
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) {
    console.error('Event deletion error:', error)
    throw new Error(`Failed to delete event: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('event_delete', {
    event_id: eventId
  })
}

// Export types
export type { CreateEventInput, UpdateEventInput } from './validators'
