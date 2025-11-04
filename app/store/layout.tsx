import { Metadata } from 'next'
import Link from 'next/link'
import StoreNav from '@/components/StoreNav'
import Analytics from '@/components/Analytics'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luwani.com'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Luwāni - Create a Beautiful Wedding Website',
    template: '%s | Luwāni'
  },
  description: 'Celebrate your story globally — elegant, personal, no code needed. Create stunning wedding websites with customizable templates, RSVP management, and guest tools.',
  keywords: ['wedding website', 'wedding planning', 'RSVP management', 'wedding invitations', 'wedding templates', 'custom wedding website', 'wedding website builder'],
  authors: [{ name: 'Luwāni' }],
  creator: 'Luwāni',
  publisher: 'Luwāni',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${baseUrl}/store`,
    siteName: 'Luwāni',
    title: 'Luwāni - Create a Beautiful Wedding Website',
    description: 'Celebrate your story globally — elegant, personal, no code needed. Create stunning wedding websites with customizable templates.',
    images: [
      {
        url: `${baseUrl}/images/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Luwāni - Wedding Website Builder',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Luwāni - Create a Beautiful Wedding Website',
    description: 'Celebrate your story globally — elegant, personal, no code needed.',
    images: [`${baseUrl}/images/og-image.png`],
    creator: '@luwani',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: `${baseUrl}/store`,
  },
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
        <Analytics />
        {/* Storefront Header */}
        <StoreNav />

        <main>{children}</main>

        {/* Storefront Footer */}
        <footer className="border-t bg-white/70 backdrop-blur py-8 sm:py-10 mt-12 sm:mt-16 md:mt-20">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
              <div>
                <h3 className="font-semibold mb-3 text-[#1E1E1E]">Product</h3>
                <ul className="space-y-2 text-sm text-[#1E1E1E]/70">
                  <li><Link href="/store#pricing" className="hover:text-[#C8A951] transition-colors">Pricing</Link></li>
                  <li><Link href="/store/demo" className="hover:text-[#C8A951] transition-colors">Demo</Link></li>
                  <li><Link href="/store/features" className="hover:text-[#C8A951] transition-colors">Features</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-[#1E1E1E]">Resources</h3>
                <ul className="space-y-2 text-sm text-[#1E1E1E]/70">
                  <li><Link href="/help" className="hover:text-[#C8A951] transition-colors">Help Center</Link></li>
                  <li><Link href="/store/templates" className="hover:text-[#C8A951] transition-colors">Templates</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-[#1E1E1E]">Company</h3>
                <ul className="space-y-2 text-sm text-[#1E1E1E]/70">
                  <li><Link href="/about" className="hover:text-[#C8A951] transition-colors">About</Link></li>
                  <li><Link href="/store/contact" className="hover:text-[#C8A951] transition-colors">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-[#1E1E1E]">Legal</h3>
                <ul className="space-y-2 text-sm text-[#1E1E1E]/70">
                  <li><Link href="/privacy" className="hover:text-[#C8A951] transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-[#C8A951] transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t pt-8 text-center text-sm text-[#1E1E1E]/60">
              <p>© {new Date().getFullYear()} Luwāni. Made with ❤️</p>
            </div>
          </div>
        </footer>
      </div>
  )
}

