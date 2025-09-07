import { supabaseServer } from '@/lib/supabase-server'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const supabase = await supabaseServer()
  
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true })

  if (error) {
    console.error('Error fetching events:', error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage wedding events and ceremonies
          </p>
        </div>
      </div>

      <EventsClient initialEvents={events || []} />
    </div>
  )
}
