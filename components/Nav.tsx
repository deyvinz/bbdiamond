import { getWeddingContext } from '@/lib/wedding-context-server';
import { getWeddingTheme, getDefaultTheme } from '@/lib/theme-service';
import NavClient from './NavClient';

export default async function Nav() {
  const context = await getWeddingContext();
  
  // Build navigation links based on wedding feature flags
  const links: Array<[string, string]> = [
    ['Schedule', '/schedule'],
  ];
  
  if (context?.wedding) {
    const { wedding } = context;
    
    if (wedding.enable_travel) {
      links.push(['Travel & Hotels', '/travel']);
    }
    if (wedding.enable_wedding_party) {
      links.push(['Wedding Party', '/wedding-party']);
    }
    if (wedding.enable_registry && wedding.registry_url) {
      links.push(['Registry', '/registry']);
    }
    if (wedding.enable_gallery) {
      links.push(['Gallery', '/gallery']);
    }
    if (wedding.enable_things_to_do) {
      links.push(['Things to do', '/things-to-do']);
    }
    if (wedding.enable_faq) {
      links.push(['FAQ', '/faq']);
    }
    if (wedding.enable_seating) {
      links.push(['Seating', '/seating']);
    }
    links.push(['RSVP', '/rsvp']);
    if (wedding.enable_guest_notes) {
      links.push(['Well Wishes', '/guest-notes']);
    }
  } else {
    // Fallback links if no wedding context
    links.push(
      ['Wedding Party', '/wedding-party'],
      ['Registry', '/registry'],
      ['Gallery', '/gallery'],
      ['FAQ', '/faq'],
      ['RSVP', '/rsvp']
    );
  }

  // Get logo from theme and couple info
  let logoUrl: string | null = null;
  let logoAlt = 'Wedding';
  let brideName = '';
  let groomName = '';
  let coupleDisplayName = '';
  
  if (context?.weddingId) {
    const theme = await getWeddingTheme(context.weddingId) || getDefaultTheme();
    logoUrl = theme.logo_url || null;
    coupleDisplayName = context.wedding.couple_display_name || '';
    brideName = context.wedding.bride_name || '';
    groomName = context.wedding.groom_name || '';
    logoAlt = coupleDisplayName || 'Wedding';
  }

  return (
    <NavClient 
      logoUrl={logoUrl} 
      logoAlt={logoAlt} 
      links={links}
      brideName={brideName}
      groomName={groomName}
      coupleDisplayName={coupleDisplayName}
    />
  );
}
