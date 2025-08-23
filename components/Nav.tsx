'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'

const links = [
  ['Schedule','/schedule'],
  ['Travel','/travel'],
  ['Wedding Party','/wedding-party'],
  ['Registry','/registry'],
  ['Gallery','/gallery'],
  ['Things to do','/things-to-do'],
  ['FAQ','/faq'],
  ['RSVP','/rsvp'],
  ['Contact','/contact'],
]

export default function Nav(){
  const [open,setOpen] = useState(false)
  return (
    <nav className="mx-auto max-w-6xl px-4 md:px-6 py-3">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-serif text-2xl foil">B ♡ D</Link>
        <div className="hidden md:flex gap-6">
          {links.map(([label,href])=>(
            <Link key={href} href={href} className="text-sm hover:text-gold-700 hover:underline underline-offset-4">
              {label}
            </Link>
          ))}
        </div>
        <div className="hidden md:block">
          <Link href="/rsvp"><Button variant="gold" size="sm">RSVP</Button></Link>
        </div>
        <SidebarTrigger className="md:hidden">
          <Menu />
        </SidebarTrigger>
      </div>
      {/* Sidebar content is rendered via AppSidebar in layout */}
    </nav>
  )
}
