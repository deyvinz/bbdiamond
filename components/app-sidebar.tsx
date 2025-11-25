"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase-browser'

const baseLinks: Array<[string,string]> = [
  ['Schedule','/schedule'],
  ['Wedding Party','/wedding-party'],
  ['Registry','/registry'],
  ['Gallery','/gallery'],
  ['FAQ','/faq'],
  ['RSVP','/rsvp'],
]

export function AppSidebar(){
  const { setOpen } = useSidebar()
  const [isAdmin, setIsAdmin] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoAlt, setLogoAlt] = useState('Wedding')
  const [links, setLinks] = useState<Array<[string,string]>>(baseLinks)

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          setIsAdmin(profile?.role === 'admin')
        }
      } catch {
        setIsAdmin(false)
      }
    }
    
    const fetchWeddingInfo = async () => {
      try {
        const response = await fetch('/api/wedding-info')
        const data = await response.json()
        if (data.success && data.wedding) {
          // Set logo from API response
          setLogoUrl(data.wedding.logo_url || null)
          if (data.wedding.couple_display_name) {
            setLogoAlt(data.wedding.couple_display_name)
          }
          
          // Build links based on wedding features (matching Nav.tsx logic exactly)
          const weddingLinks: Array<[string,string]> = [['Schedule','/schedule']]
          
          if (data.wedding.enable_travel) {
            weddingLinks.push(['Travel & Hotels', '/travel'])
          }
          if (data.wedding.enable_wedding_party) {
            weddingLinks.push(['Wedding Party', '/wedding-party'])
          }
          if (data.wedding.enable_registry && data.wedding.registry_url) {
            weddingLinks.push(['Registry', '/registry'])
          }
          if (data.wedding.enable_gallery) {
            weddingLinks.push(['Gallery', '/gallery'])
          }
          if (data.wedding.enable_things_to_do) {
            weddingLinks.push(['Things to do', '/things-to-do'])
          }
          if (data.wedding.enable_faq) {
            weddingLinks.push(['FAQ', '/faq'])
          }
          if (data.wedding.enable_seating) {
            weddingLinks.push(['Seating', '/seating'])
          }
          weddingLinks.push(['RSVP', '/rsvp'])
          if (data.wedding.enable_guest_notes) {
            weddingLinks.push(['Well Wishes', '/guest-notes'])
          }
          
          setLinks(weddingLinks)
        }
      } catch (error) {
        console.error('Error fetching wedding info:', error)
      }
    }
    
    run()
    fetchWeddingInfo()
  }, [])

  // Get initials for fallback avatar (same logic as NavClient)
  const getInitials = () => {
    if (logoAlt && logoAlt !== 'Wedding') {
      const parts = logoAlt.split(/\s+/)
      if (parts.length >= 2) {
        const firstInitial = parts[0].charAt(0).toUpperCase()
        const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase()
        return `${firstInitial} ❤️ ${lastInitial}`
      }
      return logoAlt.substring(0, 2).toUpperCase()
    }
    return 'W'
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/">
          {logoUrl ? (
            <Image
              src={logoUrl}
              className="rounded-full object-cover"
              alt={logoAlt}
              width={40}
              height={40}
            />
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs font-semibold bg-gold-100 text-gold-700 border-2 border-gold-200/30 flex items-center justify-center whitespace-nowrap overflow-hidden">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ul className="space-y-3 text-lg animate-in fade-in slide-in-from-left-4 duration-300">
          {links.map(([label,href], index)=> (
            <li 
              key={href}
              className={`animate-in fade-in slide-in-from-left-4 duration-300`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="transition-all duration-200 hover:translate-x-1 hover:scale-105 active:scale-95">
                <Link 
                  href={href} 
                  onClick={()=>setOpen(false)} 
                  className="block py-2 hover:text-gold-700 transition-colors"
                >
                  {label}
                </Link>
              </div>
            </li>
          ))}
          
          {/* Admin Link */}
          {isAdmin && (
            <li className="animate-in fade-in slide-in-from-left-4 duration-300 border-t border-gold-100 pt-3 mt-3">
              <div className="transition-all duration-200 hover:translate-x-1 hover:scale-105 active:scale-95">
                <Link 
                  href="/admin" 
                  onClick={()=>setOpen(false)} 
                  className="block py-2"
                >
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    Admin
                  </Button>
                </Link>
              </div>
            </li>
          )}
        </ul>
      </SidebarContent>
    </Sidebar>
  )
}


