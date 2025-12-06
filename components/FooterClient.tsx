'use client'

import { useState } from 'react'
import { SmsOptInModal } from '@/components/SmsOptInModal'
import { MessageSquare } from 'lucide-react'

interface FooterClientProps {
  coupleName?: string
  currentYear: number
}

export const FooterClient = ({ coupleName, currentYear }: FooterClientProps) => {
  const [smsModalOpen, setSmsModalOpen] = useState(false)

  return (
    <footer className="border-t border-gold-100/60 bg-white/70 backdrop-blur py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto max-w-6xl px-4 md:px-6 text-center text-sm text-black/70">
        {coupleName && <p className="mb-2">{coupleName}</p>}

        {/* Footer Links */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <button
            type="button"
            onClick={() => setSmsModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-gold-600 hover:text-gold-700 transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 rounded"
            aria-label="Subscribe to SMS notifications"
            tabIndex={0}
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            SMS Notifications
          </button>
        </div>

        {/* Made with love */}
        <div>
          Made with love by{' '}
          <a
            href="https://glumia.com"
            className="text-gold-500 hover:text-gold-600 transition-all duration-200 hover:scale-105 active:scale-95"
            target="_blank"
            rel="noopener noreferrer"
          >
            Glumia
          </a>{' '}
          • © {currentYear}
        </div>
      </div>

      {/* SMS Opt-In Modal */}
      <SmsOptInModal open={smsModalOpen} onOpenChange={setSmsModalOpen} coupleName={coupleName} />
    </footer>
  )
}

