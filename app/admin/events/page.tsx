import { getEventsPage } from '@/lib/events-service'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  try {
    const { events } = await getEventsPage()

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

        <EventsClient initialEvents={events} />
      </div>
    )
  } catch (error) {
    console.error('Error fetching events:', error)
    
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

        <EventsClient initialEvents={[]} />
      </div>
    )
  }
}
