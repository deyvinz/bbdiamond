'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@heroui/react'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function StoreNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/store" className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/images/logo.png"
            alt="Luwāni"
            width={120}
            height={40}
            className="h-8 sm:h-10 w-auto"
            priority
          />
          <div className="hidden lg:block text-xs text-[#1E1E1E]/70 font-normal">
            Celebrate your story, globally.
          </div>
        </Link>
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          <Link href="/store#features" className="text-sm text-[#1E1E1E] hover:text-[#C8A951] transition-colors">
            Features
          </Link>
          <Link href="/store#pricing" className="text-sm text-[#1E1E1E] hover:text-[#C8A951] transition-colors">
            Pricing
          </Link>
          <Link href="/store#templates" className="text-sm text-[#1E1E1E] hover:text-[#C8A951] transition-colors">
            Templates
          </Link>
          <Link href="/auth/sign-in" className="text-sm text-[#1E1E1E] hover:text-[#C8A951] transition-colors">
            Sign In
          </Link>
          <Link href="/store/signup">
            <Button 
              className="bg-[#C8A951] text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300"
              size="sm"
              radius="lg"
            >
              Get Started
            </Button>
          </Link>
        </nav>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#1E1E1E] hover:text-[#C8A951] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t bg-white px-4 py-4 space-y-3">
          <Link 
            href="/store#features" 
            className="block text-sm text-[#1E1E1E] hover:text-[#C8A951] transition-colors py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Features
          </Link>
          <Link 
            href="/store#pricing" 
            className="block text-sm text-[#1E1E1E] hover:text-[#C8A951] transition-colors py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Pricing
          </Link>
          <Link 
            href="/store#templates" 
            className="block text-sm text-[#1E1E1E] hover:text-[#C8A951] transition-colors py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Templates
          </Link>
          <Link 
            href="/auth/sign-in" 
            className="block text-sm text-[#1E1E1E] hover:text-[#C8A951] transition-colors py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Sign In
          </Link>
          <Link href="/store/signup" onClick={() => setMobileMenuOpen(false)}>
            <Button 
              className="w-full bg-[#C8A951] text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 mt-2"
              size="md"
              radius="lg"
            >
              Get Started
            </Button>
          </Link>
        </nav>
      )}
    </header>
  )
}

