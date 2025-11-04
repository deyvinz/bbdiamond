'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Button as HeroUIButton } from '@heroui/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase-browser';
import { useEffect, useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface NavClientProps {
  logoUrl?: string | null;
  logoAlt?: string;
  links: Array<[string, string]>;
  brideName?: string;
  groomName?: string;
  coupleDisplayName?: string;
}

export default function NavClient({ 
  logoUrl, 
  logoAlt = 'Wedding', 
  links,
  brideName = '',
  groomName = '',
  coupleDisplayName = ''
}: NavClientProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  // Get initials from bride and groom names with love emoticon
  const getInitials = () => {
    if (brideName && groomName) {
      const brideInitial = brideName.charAt(0).toUpperCase();
      const groomInitial = groomName.charAt(0).toUpperCase();
      return `${brideInitial} ❤️ ${groomInitial}`;
    }
    if (coupleDisplayName) {
      const parts = coupleDisplayName.split(/\s+/);
      if (parts.length >= 2) {
        const firstInitial = parts[0].charAt(0).toUpperCase();
        const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
        return `${firstInitial} ❤️ ${lastInitial}`;
      }
      return coupleDisplayName.substring(0, 2).toUpperCase();
    }
    return 'W';
  };

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
          {logoUrl ? (
            <Image
              src={logoUrl}
              className="rounded-full object-cover"
              alt={logoAlt}
              width={48}
              height={48}
            />
          ) : (
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-xs font-semibold bg-gold-100 text-gold-700 border-2 border-gold-200/30 flex items-center justify-center whitespace-nowrap overflow-hidden">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          )}
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
            <HeroUIButton color="primary" size="sm" radius="md">
              RSVP
            </HeroUIButton>
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

