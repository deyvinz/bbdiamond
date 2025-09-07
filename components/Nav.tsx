'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase-browser';
import { useEffect, useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

const links = [
  ['Schedule', '/schedule'],
  // ['Travel','/travel'],
  ['Wedding Party', '/wedding-party'],
  ['Registry', '/registry'],
  ['Gallery', '/gallery'],
  ['Things to do', '/things-to-do'],
  ['FAQ', '/faq'],
  ['RSVP', '/rsvp'],
 // ['Contact', '/contact'],
];

export default function Nav() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          // if you have a claim/metadata to mark admin, check here
          const isStaff = (data.user.user_metadata as any)?.role === 'admin' || (data.user.app_metadata as any)?.roles?.includes('admin');
          // fallback: consider any authenticated user as admin (adjust to your RLS)
          setIsAdmin(!!data.user && (isStaff || true));
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    run();
  }, []);

  return (
    <nav className="mx-auto max-w-6xl px-4 md:px-6 py-3">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Image
            src="/images/logo.png"
            className="rounded-full"
            alt="Brenda and Diamond"
            width={40}
            height={40}
          />
        </Link>
        <div className="hidden md:flex gap-6">
          {links.map(([label, href]) => (
            <div key={href}>
              <Link
                href={href}
                className="text-sm hover:text-gold-700 hover:underline underline-offset-4 relative transition-all duration-150 hover:scale-105 active:scale-95"
              >
                <span className="block">{label}</span>
              </Link>
            </div>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm">Admin</Button>
            </Link>
          )}
          <Link href="/rsvp">
            <Button variant="gold" size="sm">
              RSVP
            </Button>
          </Link>
        </div>
        <SidebarTrigger className="md:hidden">
          <Menu />
        </SidebarTrigger>
      </div>
      {/* Sidebar content is rendered via AppSidebar in layout */}
    </nav>
  );
}
