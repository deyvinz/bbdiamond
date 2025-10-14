import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getAppConfig } from '@/lib/config-service'
import ConfigClient from './ConfigClient'

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ConfigPage() {
  try {
    const config = await getAppConfig()
    console.log('🔍 [ConfigPage] Fetched config:', config)

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
              <h1 className="text-2xl lg:text-3xl font-bold">Configuration</h1>
              <p className="text-muted-foreground">
                Manage application settings and features
              </p>
            </div>
          </div>
        </div>

        <ConfigClient initialConfig={config} />
      </div>
    )
  } catch (error) {
    console.error('Error fetching config:', error)
    
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
              <h1 className="text-2xl lg:text-3xl font-bold">Configuration</h1>
              <p className="text-muted-foreground">
                Manage application settings and features
              </p>
            </div>
          </div>
        </div>

        <ConfigClient initialConfig={{
          plus_ones_enabled: false,
          max_party_size: 1,
          allow_guest_plus_ones: false,
          rsvp_enabled: true,
          rsvp_cutoff_date: undefined,
          rsvp_cutoff_timezone: 'America/New_York',
        }} />
      </div>
    )
  }
}
