import { Metadata } from 'next'
import Link from 'next/link'
import StoreNav from '@/components/StoreNav'

export const metadata: Metadata = {
  title: 'Luwāni - Create a Beautiful Wedding Website',
  description: 'Celebrate your story globally — elegant, personal, no code needed.',
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
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

