"use client"
import Link from 'next/link'
import Image from 'next/image'
import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from '@/components/ui/sidebar'

const links: Array<[string,string]> = [
  ['Schedule','/schedule'],
  ['Wedding Party','/wedding-party'],
  ['Registry','/registry'],
  ['Gallery','/gallery'],
  ['Things to do','/things-to-do'],
  ['FAQ','/faq'],
  ['RSVP','/rsvp'],
]

export function AppSidebar(){
  const { setOpen } = useSidebar()
  return (
    <Sidebar>
      <SidebarHeader>
      <Link href="/">
          <Image
            src="/images/logo.png"
            className="rounded-full"
            alt="Brenda and Diamond"
            width={40}
            height={40}
          />
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
        </ul>
      </SidebarContent>
    </Sidebar>
  )
}


