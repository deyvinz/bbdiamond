import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getEventsPage } from '@/lib/events-service'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  try {
    const { events } = await getEventsPage()

    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Events</h1>
              <p className="text-muted-foreground">
                Manage wedding events and ceremonies
              </p>
            </div>
          </div>
        </div>

        <EventsClient initialEvents={events} />
      </div>
    )
  } catch (error) {
    console.error('Error fetching events:', error)
    
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Events</h1>
              <p className="text-muted-foreground">
                Manage wedding events and ceremonies
              </p>
            </div>
          </div>
        </div>

        <EventsClient initialEvents={[]} />
      </div>
    )
  }
}
