"use client"
import Link from 'next/link'
import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from '@/components/ui/sidebar'

const links: Array<[string,string]> = [
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

export function AppSidebar(){
  const { setOpen } = useSidebar()
  return (
    <Sidebar>
      <SidebarHeader>
        <span className="font-serif text-2xl foil">B ♡ D</span>
      </SidebarHeader>
      <SidebarContent>
        <ul className="space-y-3 text-lg">
          {links.map(([label,href])=> (
            <li key={href}>
              <Link href={href} onClick={()=>setOpen(false)} className="block py-2 hover:text-gold-700">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </SidebarContent>
    </Sidebar>
  )
}


