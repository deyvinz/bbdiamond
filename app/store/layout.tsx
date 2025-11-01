import { Metadata } from 'next'
import Link from 'next/link'
import { HeroUIProvider } from '@heroui/react'
import { Button } from '@heroui/react'

export const metadata: Metadata = {
  title: 'Wedding Platform - Create Your Perfect Wedding Website',
  description: 'Beautiful, customizable wedding websites. Set up in minutes.',
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <div className="min-h-screen">
        {/* Storefront Header */}
        <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
          <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/store">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-serif font-bold bg-gradient-to-r from-gold-600 to-gold-800 bg-clip-text text-transparent">
                  Wedding Platform
                </div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/store" className="text-sm hover:text-primary transition-colors">
                Pricing
              </Link>
              <Link href="/store/demo" className="text-sm hover:text-primary transition-colors">
                Demo
              </Link>
              <Link href="/auth/sign-in" className="text-sm hover:text-primary transition-colors">
                Sign In
              </Link>
              <Link href="/store/signup">
                <Button 
                  color="primary" 
                  size="sm"
                  className="rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                  radius="lg"
                >
                  Start Free Trial
                </Button>
              </Link>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        {/* Storefront Footer */}
        <footer className="border-t bg-white/70 backdrop-blur py-10 mt-20">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-semibold mb-3">Product</h3>
                <ul className="space-y-2 text-sm text-default-500">
                  <li><Link href="/store" className="hover:text-primary">Pricing</Link></li>
                  <li><Link href="/store/demo" className="hover:text-primary">Demo</Link></li>
                  <li><Link href="/store/features" className="hover:text-primary">Features</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Resources</h3>
                <ul className="space-y-2 text-sm text-default-500">
                  <li><Link href="/help" className="hover:text-primary">Help Center</Link></li>
                  <li><Link href="/docs" className="hover:text-primary">Documentation</Link></li>
                  <li><Link href="/templates" className="hover:text-primary">Templates</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Company</h3>
                <ul className="space-y-2 text-sm text-default-500">
                  <li><Link href="/about" className="hover:text-primary">About</Link></li>
                  <li><Link href="/store/contact" className="hover:text-primary">Contact</Link></li>
                  <li><Link href="/blog" className="hover:text-primary">Blog</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Legal</h3>
                <ul className="space-y-2 text-sm text-default-500">
                  <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t pt-8 text-center text-sm text-default-500">
              <p>© {new Date().getFullYear()} Wedding Platform. Made with ❤️</p>
            </div>
          </div>
        </footer>
      </div>
    </HeroUIProvider>
  )
}

