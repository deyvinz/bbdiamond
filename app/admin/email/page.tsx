import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getWeddingId } from '@/lib/wedding-context-server'
import { getEmailConfig } from '@/lib/email-service'
import EmailConfigClient from './EmailConfigClient'

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EmailConfigPage() {
  try {
    const weddingId = await getWeddingId()
    
    if (!weddingId) {
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
                <h1 className="text-2xl lg:text-3xl font-bold">Email Settings</h1>
                <p className="text-muted-foreground">
                  Manage email configuration and branding
                </p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">No wedding context found. Please ensure you're accessing this page from a valid wedding domain.</p>
          </div>
        </div>
      )
    }

    const emailConfigData = await getEmailConfig(weddingId)

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
              <h1 className="text-2xl lg:text-3xl font-bold">Email Settings</h1>
              <p className="text-muted-foreground">
                Manage email configuration and branding
              </p>
            </div>
          </div>
        </div>

        <EmailConfigClient initialConfig={emailConfigData} />
      </div>
    )
  } catch (error) {
    console.error('Error fetching email config:', error)
    
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
              <h1 className="text-2xl lg:text-3xl font-bold">Email Settings</h1>
              <p className="text-muted-foreground">
                Manage email configuration and branding
              </p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading email configuration. Please try again.</p>
        </div>
      </div>
    )
  }
}

