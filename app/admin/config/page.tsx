import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getAppConfig } from '@/lib/config-service'
import ConfigClient from './ConfigClient'

export default async function ConfigPage() {
  try {
    const config = await getAppConfig()

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
        }} />
      </div>
    )
  }
}
