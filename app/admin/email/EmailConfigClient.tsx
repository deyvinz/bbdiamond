'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Save, Mail, Palette, Image as ImageIcon, Info } from 'lucide-react'
import type { EmailConfigData } from '@/lib/email-service'
import EmailFooterEditor from '@/components/EmailFooterEditor'

interface EmailConfigClientProps {
  initialConfig: EmailConfigData | null
}

export default function EmailConfigClient({ initialConfig }: EmailConfigClientProps) {
  const [config, setConfig] = useState({
    fromName: initialConfig?.config.fromName || '',
    fromEmail: initialConfig?.config.fromEmail || '',
    replyToEmail: initialConfig?.config.replyToEmail || '',
    invitationSubjectTemplate: initialConfig?.config.invitationSubjectTemplate || "You're Invited, {guest_name} — {event_name}",
    rsvpConfirmationSubjectTemplate: initialConfig?.config.rsvpConfirmationSubjectTemplate || 'RSVP Confirmation — {event_name}',
    customFooterText: initialConfig?.config.customFooterText || '',
    logoUrl: initialConfig?.config.logoUrl || '',
    primaryColor: initialConfig?.config.primaryColor || initialConfig?.branding.primaryColor || '#C7A049',
    footerHtml: initialConfig?.config.footerHtml || '',
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Sync state when initialConfig prop changes
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        fromName: initialConfig.config.fromName || '',
        fromEmail: initialConfig.config.fromEmail || '',
        replyToEmail: initialConfig.config.replyToEmail || '',
        invitationSubjectTemplate: initialConfig.config.invitationSubjectTemplate || "You're Invited, {guest_name} — {event_name}",
        rsvpConfirmationSubjectTemplate: initialConfig.config.rsvpConfirmationSubjectTemplate || 'RSVP Confirmation — {event_name}',
        customFooterText: initialConfig.config.customFooterText || '',
        logoUrl: initialConfig.config.logoUrl || '',
        primaryColor: initialConfig.config.primaryColor || initialConfig.branding.primaryColor || '#C7A049',
        footerHtml: initialConfig.config.footerHtml || '',
      })
    }
  }, [initialConfig])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateHexColor = (color: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
  }

  const handleSave = async () => {
    // Validation
    if (!config.fromName.trim()) {
      toast({
        title: "Validation Error",
        description: "From name is required",
        variant: "destructive",
      })
      return
    }

    if (!config.fromEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "From email is required",
        variant: "destructive",
      })
      return
    }

    if (!validateEmail(config.fromEmail)) {
      toast({
        title: "Validation Error",
        description: "From email must be a valid email address",
        variant: "destructive",
      })
      return
    }

    if (config.replyToEmail && !validateEmail(config.replyToEmail)) {
      toast({
        title: "Validation Error",
        description: "Reply-to email must be a valid email address",
        variant: "destructive",
      })
      return
    }

    if (config.primaryColor && !validateHexColor(config.primaryColor)) {
      toast({
        title: "Validation Error",
        description: "Primary color must be a valid hex color code (e.g., #C7A049)",
        variant: "destructive",
      })
      return
    }

    if (config.logoUrl && !config.logoUrl.match(/^https?:\/\/.+/)) {
      toast({
        title: "Validation Error",
        description: "Logo URL must be a valid HTTP/HTTPS URL",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/admin/email-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_name: config.fromName.trim(),
          from_email: config.fromEmail.trim(),
          reply_to_email: config.replyToEmail.trim() || null,
          invitation_subject_template: config.invitationSubjectTemplate.trim(),
          rsvp_confirmation_subject_template: config.rsvpConfirmationSubjectTemplate.trim(),
          custom_footer_text: config.customFooterText.trim() || null,
          logo_url: config.logoUrl.trim() || null,
          primary_color: config.primaryColor.trim() || null,
          footer_html: config.footerHtml.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update email configuration')
      }

      const updatedConfig = await response.json()
      
      // Refresh the router to get updated data from the server
      router.refresh()
      
      toast({
        title: "Email Configuration Updated Successfully!",
        description: "Your email settings have been saved and will be used for all outgoing emails.",
      })
    } catch (error) {
      console.error('Email config save error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update email configuration",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* From Address Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            From Address
          </CardTitle>
          <CardDescription>
            Configure the sender name and email address for all outgoing emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fromName">
              From Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fromName"
              value={config.fromName}
              onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
              placeholder="Brenda & Diamond"
              maxLength={100}
            />
            <p className="text-sm text-muted-foreground">
              The display name that appears in the "From" field of emails
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromEmail">
              From Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fromEmail"
              type="email"
              value={config.fromEmail}
              onChange={(e) => setConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
              placeholder="noreply@example.com"
            />
            <p className="text-sm text-muted-foreground">
              The email address that sends emails. Must be verified in Resend for custom domains.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="replyToEmail">
              Reply-To Email
            </Label>
            <Input
              id="replyToEmail"
              type="email"
              value={config.replyToEmail}
              onChange={(e) => setConfig(prev => ({ ...prev, replyToEmail: e.target.value }))}
              placeholder="contact@example.com"
            />
            <p className="text-sm text-muted-foreground">
              Email address where replies will be sent (optional)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subject Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Templates</CardTitle>
          <CardDescription>
            Customize email subject lines. Use variables: {'{guest_name}'}, {'{event_name}'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invitationSubjectTemplate">
              Invitation Subject Template
            </Label>
            <Input
              id="invitationSubjectTemplate"
              value={config.invitationSubjectTemplate}
              onChange={(e) => setConfig(prev => ({ ...prev, invitationSubjectTemplate: e.target.value }))}
              placeholder="You're Invited, {guest_name} — {event_name}"
            />
            <p className="text-sm text-muted-foreground">
              Template for invitation email subjects
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rsvpConfirmationSubjectTemplate">
              RSVP Confirmation Subject Template
            </Label>
            <Input
              id="rsvpConfirmationSubjectTemplate"
              value={config.rsvpConfirmationSubjectTemplate}
              onChange={(e) => setConfig(prev => ({ ...prev, rsvpConfirmationSubjectTemplate: e.target.value }))}
              placeholder="RSVP Confirmation — {event_name}"
            />
            <p className="text-sm text-muted-foreground">
              Template for RSVP confirmation email subjects
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Branding Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Email Branding
          </CardTitle>
          <CardDescription>
            Customize the visual appearance of your emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logoUrl">
              Logo URL
            </Label>
            <Input
              id="logoUrl"
              type="url"
              value={config.logoUrl}
              onChange={(e) => setConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-sm text-muted-foreground">
              URL to your logo image. If not set, will use logo from theme settings.
            </p>
            {config.logoUrl && (
              <div className="mt-2">
                <img 
                  src={config.logoUrl} 
                  alt="Logo preview" 
                  className="max-h-20 border border-gray-200 rounded p-2"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryColor">
              Primary Color
            </Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={config.primaryColor}
                onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={config.primaryColor}
                onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                placeholder="#C7A049"
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Primary brand color for email buttons and accents. If not set, will use color from theme settings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer Section */}
      <Card>
        <CardHeader>
          <CardTitle>Email Footer</CardTitle>
          <CardDescription>
            Customize the footer content for your emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customFooterText">
              Custom Footer Text
            </Label>
            <Textarea
              id="customFooterText"
              value={config.customFooterText}
              onChange={(e) => setConfig(prev => ({ ...prev, customFooterText: e.target.value }))}
              placeholder="Optional custom footer text"
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Plain text footer message (optional)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footerHtml">
              Custom Footer HTML
            </Label>
            <EmailFooterEditor
              content={config.footerHtml}
              onChange={(html) => setConfig(prev => ({ ...prev, footerHtml: html }))}
              placeholder="Enter custom footer HTML..."
            />
            <p className="text-sm text-muted-foreground">
              Rich HTML footer content. This will override the plain text footer if provided.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Domain Information Section */}
      {initialConfig?.config.verifiedDomain && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Domain Verification
            </CardTitle>
            <CardDescription>
              Information about your verified email domain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Verified Domain</Label>
              <Input
                value={initialConfig.config.verifiedDomain}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-muted-foreground">
                Your custom domain is verified in Resend and can be used for sending emails.
              </p>
            </div>
            {initialConfig.config.resendDomainId && (
              <div className="space-y-2">
                <Label>Resend Domain ID</Label>
                <Input
                  value={initialConfig.config.resendDomainId}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSave}
          disabled={loading}
          size="lg"
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Email Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

