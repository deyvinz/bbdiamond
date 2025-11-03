'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Save, RotateCcw, Settings, Clock, Calendar, Lock, Utensils } from 'lucide-react'
import Link from 'next/link'
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
      // Prepare config for saving
      // Build object with only fields that should be updated
      const configToSave: UpdateConfigInput = {}
      
      // Explicitly include all non-undefined fields from config
      // This ensures message fields are included when they have values (including empty strings to clear them)
      if (config.dress_code_message !== undefined) {
        configToSave.dress_code_message = config.dress_code_message
      }
      if (config.age_restriction_message !== undefined) {
        configToSave.age_restriction_message = config.age_restriction_message
      }
      if (config.plus_ones_enabled !== undefined) {
        configToSave.plus_ones_enabled = config.plus_ones_enabled
      }
      if (config.max_party_size !== undefined) {
        configToSave.max_party_size = config.max_party_size
      }
      if (config.allow_guest_plus_ones !== undefined) {
        configToSave.allow_guest_plus_ones = config.allow_guest_plus_ones
      }
      if (config.rsvp_enabled !== undefined) {
        configToSave.rsvp_enabled = config.rsvp_enabled
      }
      if (config.rsvp_cutoff_date !== undefined) {
        configToSave.rsvp_cutoff_date = config.rsvp_cutoff_date || undefined
      }
      if (config.rsvp_cutoff_timezone !== undefined) {
        configToSave.rsvp_cutoff_timezone = config.rsvp_cutoff_timezone
      }
      if (config.access_code_enabled !== undefined) {
        configToSave.access_code_enabled = config.access_code_enabled
      }
      if (config.access_code_required_seating !== undefined) {
        configToSave.access_code_required_seating = config.access_code_required_seating
      }
      if (config.access_code_required_schedule !== undefined) {
        configToSave.access_code_required_schedule = config.access_code_required_schedule
      }
      if (config.access_code_required_event_details !== undefined) {
        configToSave.access_code_required_event_details = config.access_code_required_event_details
      }
      if (config.food_choices_enabled !== undefined) {
        configToSave.food_choices_enabled = config.food_choices_enabled
      }
      if (config.food_choices_required !== undefined) {
        configToSave.food_choices_required = config.food_choices_required
      }
      
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configToSave),
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
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Access Code Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="access_code_enabled" className="text-base">
                  Enable Access Code Requirement
                </Label>
                <p className="text-sm text-muted-foreground">
                  Require invite codes to access protected pages (seating, schedule, event details)
                </p>
              </div>
              <Switch
                id="access_code_enabled"
                checked={config.access_code_enabled}
                onCheckedChange={(checked) => handleConfigChange('access_code_enabled', checked)}
                disabled={loading}
              />
            </div>

            {config.access_code_enabled && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="access_code_required_seating" className="text-base">
                      Require for Seating Chart
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Guests must enter invite code to view seating assignments
                    </p>
                  </div>
                  <Switch
                    id="access_code_required_seating"
                    checked={config.access_code_required_seating}
                    onCheckedChange={(checked) => handleConfigChange('access_code_required_seating', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="access_code_required_schedule" className="text-base">
                      Require for Schedule
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Guests must enter invite code to view wedding schedule
                    </p>
                  </div>
                  <Switch
                    id="access_code_required_schedule"
                    checked={config.access_code_required_schedule}
                    onCheckedChange={(checked) => handleConfigChange('access_code_required_schedule', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="access_code_required_event_details" className="text-base">
                      Require for Event Details
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Guests must enter invite code to view detailed event information
                    </p>
                  </div>
                  <Switch
                    id="access_code_required_event_details"
                    checked={config.access_code_required_event_details}
                    onCheckedChange={(checked) => handleConfigChange('access_code_required_event_details', checked)}
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {!config.access_code_enabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ℹ️ <strong>Access codes are disabled.</strong> All pages are publicly accessible without authentication.
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
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Dietary Requirements & Food Choices Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="food_choices_enabled" className="text-base">
                  Enable Food Choice Selection
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow guests to select meal preferences during RSVP
                </p>
              </div>
              <Switch
                id="food_choices_enabled"
                checked={config.food_choices_enabled}
                onCheckedChange={(checked) => handleConfigChange('food_choices_enabled', checked)}
                disabled={loading}
              />
            </div>

            {config.food_choices_enabled && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="food_choices_required" className="text-base">
                      Require Food Choice
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Make food choice selection mandatory when guests accept invitation
                    </p>
                  </div>
                  <Switch
                    id="food_choices_required"
                    checked={config.food_choices_required}
                    onCheckedChange={(checked) => handleConfigChange('food_choices_required', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    ℹ️ <strong>Food choices management:</strong> Add and manage meal options from the{' '}
                    <Link href="/admin/food-choices" className="underline font-medium">
                      Food Choices
                    </Link>{' '}
                    page in the admin panel.
                  </p>
                </div>
              </>
            )}

            {!config.food_choices_enabled && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-800">
                  ℹ️ <strong>Food choices are disabled.</strong> Guests will not be prompted to select meal preferences during RSVP.
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
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Details Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dress_code_message">Dress Code Message</Label>
              <Textarea
                id="dress_code_message"
                placeholder="e.g., White and ivory outfits are not permitted for guests. Please choose other colors to let the couple stand out on their special day."
                value={config.dress_code_message || ''}
                onChange={(e) => handleConfigChange('dress_code_message', e.target.value)}
                disabled={loading}
                rows={3}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Custom message about dress code restrictions that will appear on the Event Details page. Leave empty to hide this message.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age_restriction_message">Age Restriction Message</Label>
              <Textarea
                id="age_restriction_message"
                placeholder="e.g., No kids allowed. This is an adult only event."
                value={config.age_restriction_message || ''}
                onChange={(e) => handleConfigChange('age_restriction_message', e.target.value)}
                disabled={loading}
                rows={3}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Custom message about age restrictions that will appear on the Event Details page. Leave empty to hide this message.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ℹ️ <strong>Preview:</strong> These messages will appear in a gold notice box at the bottom of the Event Details page. If both messages are set, they will be displayed together.
              </p>
            </div>
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
            <div>
              <div className="font-medium">Access Code Enabled</div>
              <div className={config.access_code_enabled ? 'text-green-600' : 'text-red-600'}>
                {config.access_code_enabled ? 'Yes' : 'No'}
              </div>
            </div>
            <div>
              <div className="font-medium">Food Choices Enabled</div>
              <div className={config.food_choices_enabled ? 'text-green-600' : 'text-red-600'}>
                {config.food_choices_enabled ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
          
          {/* Event Details Messages Section */}
          {(config.dress_code_message || config.age_restriction_message) && (
            <div className="mt-6 pt-6 border-t space-y-4">
              <h4 className="font-semibold text-base mb-3">Event Details Messages</h4>
              {config.dress_code_message && (
                <div>
                  <div className="font-medium text-sm mb-1">Dress Code Message</div>
                  <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md border">
                    {config.dress_code_message}
                  </div>
                </div>
              )}
              {config.age_restriction_message && (
                <div>
                  <div className="font-medium text-sm mb-1">Age Restriction Message</div>
                  <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md border">
                    {config.age_restriction_message}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
