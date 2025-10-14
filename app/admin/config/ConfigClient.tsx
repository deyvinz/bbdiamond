'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Save, RotateCcw, Settings, Clock, Calendar } from 'lucide-react'
import type { ConfigValue } from '@/lib/types/config'
import { COMMON_TIMEZONES } from '@/lib/types/config'
import type { UpdateConfigInput } from '@/lib/validators'

interface ConfigClientProps {
  initialConfig: ConfigValue
}

export default function ConfigClient({ initialConfig }: ConfigClientProps) {
  console.log('🔄 [ConfigClient] Rendered with initialConfig:', initialConfig)
  
  const [config, setConfig] = useState<ConfigValue>(initialConfig)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Sync state when initialConfig prop changes (after router.refresh())
  useEffect(() => {
    console.log('📥 [ConfigClient] useEffect - syncing initialConfig to state')
    console.log('  initialConfig:', initialConfig)
    console.log('  current state:', config)
    setConfig(initialConfig)
  }, [initialConfig])

  const handleSave = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update configuration')
      }

      const updatedConfig = await response.json()
      setConfig(updatedConfig)
      
      // Refresh the router to get updated data from the server
      router.refresh()
      
      toast({
        title: "⚙️ Configuration Updated Successfully!",
        description: "Your wedding website settings have been saved and are now active.",
      })
    } catch (error) {
      console.error('Config save error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update configuration",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all configuration to default values? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reset configuration')
      }

      const resetConfig = await response.json()
      setConfig(resetConfig)
      
      // Refresh the router to get updated data from the server
      router.refresh()
      
      toast({
        title: "🔄 Configuration Reset Successfully!",
        description: "All settings have been restored to their default values.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset configuration",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (key: keyof ConfigValue, value: boolean | number | string | undefined) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Format datetime-local input value from ISO string
  const formatDateTimeLocal = (isoString?: string) => {
    if (!isoString) return ''
    // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
    return isoString.slice(0, 16)
  }

  // Convert datetime-local input to ISO string
  const handleDateTimeChange = (value: string) => {
    if (!value) {
      handleConfigChange('rsvp_cutoff_date', undefined)
      return
    }
    // Convert datetime-local format to ISO string
    const isoString = new Date(value).toISOString()
    handleConfigChange('rsvp_cutoff_date', isoString)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Plus-One Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="plus_ones_enabled" className="text-base">
                  Enable Plus-Ones
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow guests to bring plus-ones to wedding events
                </p>
              </div>
              <Switch
                id="plus_ones_enabled"
                checked={config.plus_ones_enabled}
                onCheckedChange={(checked) => handleConfigChange('plus_ones_enabled', checked)}
                disabled={loading}
              />
            </div>

            {config.plus_ones_enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="max_party_size">Maximum Party Size</Label>
                  <Input
                    id="max_party_size"
                    type="number"
                    min="1"
                    max="20"
                    value={config.max_party_size}
                    onChange={(e) => handleConfigChange('max_party_size', parseInt(e.target.value, 10))}
                    disabled={loading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum number of people allowed per invitation (including the main guest)
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow_guest_plus_ones" className="text-base">
                      Allow Guest Plus-Ones
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Let guests specify their own plus-ones when RSVPing
                    </p>
                  </div>
                  <Switch
                    id="allow_guest_plus_ones"
                    checked={config.allow_guest_plus_ones}
                    onCheckedChange={(checked) => handleConfigChange('allow_guest_plus_ones', checked)}
                    disabled={loading}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={loading} className="flex-1 sm:flex-none">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            RSVP Cutoff Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="rsvp_enabled" className="text-base">
                  Enable RSVP
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow guests to RSVP to wedding events
                </p>
              </div>
              <Switch
                id="rsvp_enabled"
                checked={config.rsvp_enabled}
                onCheckedChange={(checked) => handleConfigChange('rsvp_enabled', checked)}
                disabled={loading}
              />
            </div>

            {!config.rsvp_enabled && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  ⚠️ <strong>RSVP is currently disabled.</strong> Guests will not be able to respond to invitations.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="rsvp_cutoff_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                RSVP Cutoff Date & Time
              </Label>
              <Input
                id="rsvp_cutoff_date"
                type="datetime-local"
                value={formatDateTimeLocal(config.rsvp_cutoff_date)}
                onChange={(e) => handleDateTimeChange(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Set a deadline for guests to RSVP. After this time, the RSVP feature will be automatically disabled.
                Leave empty for no cutoff.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rsvp_cutoff_timezone">Timezone</Label>
              <Select
                value={config.rsvp_cutoff_timezone || 'America/New_York'}
                onValueChange={(value) => handleConfigChange('rsvp_cutoff_timezone', value)}
                disabled={loading}
              >
                <SelectTrigger id="rsvp_cutoff_timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                The timezone for the RSVP cutoff date and time
              </p>
            </div>

            {config.rsvp_cutoff_date && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ℹ️ <strong>RSVP will close on:</strong>{' '}
                  {new Date(config.rsvp_cutoff_date).toLocaleString('en-US', {
                    timeZone: config.rsvp_cutoff_timezone || 'America/New_York',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={loading} className="flex-1 sm:flex-none">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium">Plus-Ones Enabled</div>
              <div className={config.plus_ones_enabled ? 'text-green-600' : 'text-red-600'}>
                {config.plus_ones_enabled ? 'Yes' : 'No'}
              </div>
            </div>
            <div>
              <div className="font-medium">Max Party Size</div>
              <div>{config.max_party_size}</div>
            </div>
            <div>
              <div className="font-medium">Guest Plus-Ones</div>
              <div className={config.allow_guest_plus_ones ? 'text-green-600' : 'text-red-600'}>
                {config.allow_guest_plus_ones ? 'Allowed' : 'Not Allowed'}
              </div>
            </div>
            <div>
              <div className="font-medium">RSVP Enabled</div>
              <div className={config.rsvp_enabled ? 'text-green-600' : 'text-red-600'}>
                {config.rsvp_enabled ? 'Yes' : 'No'}
              </div>
            </div>
            <div>
              <div className="font-medium">RSVP Cutoff</div>
              <div>
                {config.rsvp_cutoff_date
                  ? new Date(config.rsvp_cutoff_date).toLocaleDateString('en-US', {
                      timeZone: config.rsvp_cutoff_timezone || 'America/New_York',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Not set'}
              </div>
            </div>
            <div>
              <div className="font-medium">Timezone</div>
              <div className="truncate">
                {COMMON_TIMEZONES.find((tz) => tz.value === config.rsvp_cutoff_timezone)?.label || 'Eastern Time'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
