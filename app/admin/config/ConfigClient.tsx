'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Save, RotateCcw, Settings } from 'lucide-react'
import type { ConfigValue } from '@/lib/types/config'
import type { UpdateConfigInput } from '@/lib/validators'

interface ConfigClientProps {
  initialConfig: ConfigValue
}

export default function ConfigClient({ initialConfig }: ConfigClientProps) {
  const [config, setConfig] = useState<ConfigValue>(initialConfig)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

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
      
      toast({
        title: "⚙️ Configuration Updated Successfully!",
        description: "Your wedding website settings have been saved and are now active.",
      })
    } catch (error) {
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

  const handleConfigChange = (key: keyof ConfigValue, value: boolean | number) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }))
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

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={loading}>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
