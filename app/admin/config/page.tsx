import { getAppConfig } from '@/lib/config-service'
import ConfigClient from './ConfigClient'

export default async function ConfigPage() {
  try {
    const config = await getAppConfig()

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configuration</h1>
            <p className="text-muted-foreground">
              Manage application settings and features
            </p>
          </div>
        </div>

        <ConfigClient initialConfig={config} />
      </div>
    )
  } catch (error) {
    console.error('Error fetching config:', error)
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configuration</h1>
            <p className="text-muted-foreground">
              Manage application settings and features
            </p>
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
