import './globals.css'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { LoadingProvider } from '@/components/providers/loading-provider'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProviderServer } from '@/components/ThemeProviderServer'
import { HeroUIProviderWrapper } from '@/components/providers/hero-ui-provider'
import { getWeddingContext } from '@/lib/wedding-context-server'
import { getWeddingTheme, getDefaultTheme } from '@/lib/theme-service'
import { getGoogleFontsURL } from '@/lib/theme-service'
import Analytics from '@/components/Analytics'

export async function generateMetadata(): Promise<Metadata> {
  const context = await getWeddingContext()
  
  if (context) {
    // Get theme for favicon
    const theme = await getWeddingTheme(context.weddingId) || getDefaultTheme()
    const faviconUrl = theme.favicon_url
    
    return {
      title: context.wedding.couple_display_name || `${context.wedding.bride_name} & ${context.wedding.groom_name}`,
      description: `Wedding celebration for ${context.wedding.couple_display_name}`,
      keywords: context.wedding.hashtag || `${context.wedding.bride_name} ${context.wedding.groom_name} wedding`,
      icons: faviconUrl ? {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      } : undefined,
    }
  }

  // Fallback metadata
  return {
    title: 'Wedding Celebration',
    description: 'Join us for a special celebration',
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  
  // Check if we're on a route that should NOT show wedding navigation
  // These routes have their own layouts with their own headers/footers
  const isStorefrontRoute = pathname.startsWith('/store') || 
                            pathname.startsWith('/dashboard') || 
                            pathname.startsWith('/onboarding') ||
                            pathname.startsWith('/auth')
  
  const context = await getWeddingContext()
  const weddingId = context?.weddingId
  
  // Only show wedding navigation if:
  // 1. We have a wedding context, AND
  // 2. We're NOT on storefront/dashboard/onboarding/auth routes
  const showWeddingNavigation = !!weddingId && !isStorefrontRoute
  
  // Get theme for dynamic fonts and favicon
  let theme = getDefaultTheme()
  if (weddingId) {
    const fetchedTheme = await getWeddingTheme(weddingId)
    if (fetchedTheme) {
      theme = fetchedTheme
    }
  }

  // Dynamically load fonts based on theme
  const fontsURL = getGoogleFontsURL(theme)
  const faviconUrl = theme.favicon_url
  
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        {/* Dynamic Favicon */}
        {faviconUrl ? (
          <>
            <link rel="icon" href={faviconUrl} />
            <link rel="shortcut icon" href={faviconUrl} />
            <link rel="apple-touch-icon" href={faviconUrl} />
          </>
        ) : (
          <link rel="icon" href="/favicon.ico" />
        )}
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KZZQVJVD');`,
          }}
        />
        {/* Load Google Fonts dynamically */}
        <link rel="stylesheet" href={fontsURL} />
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --font-primary: '${theme.primary_font}', sans-serif;
              --font-secondary: '${theme.secondary_font}', serif;
              --font-family-sans: var(--font-primary);
              --font-family-serif: var(--font-secondary);
            }
          `
        }} />
      </head>
      <body 
        className="antialiased bg-white text-black selection:bg-gold-100/60 selection:text-black"
        suppressHydrationWarning={true}
        style={{
          fontFamily: 'var(--font-family-sans)',
          backgroundColor: 'var(--color-background, #FFFFFF)',
        }}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KZZQVJVD"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        <div className="fixed inset-0 -z-10 bg-subtleGrid bg-[length:16px_16px]" />
        <HeroUIProviderWrapper>
          <Analytics />
          {showWeddingNavigation ? (
            <ThemeProviderServer weddingId={weddingId!}>
              <LoadingProvider>
                <SidebarProvider>
                  <div className="min-h-dvh flex flex-col animate-in fade-in duration-500">
                    <AppSidebar />
                    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gold-100">
                      <Nav />
                    </header>
                    <main className="flex-1 mx-auto w-full container max-w-6xl px-4 md:px-6">
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {children}
                      </div>
                    </main>
                    <Footer />
                    <Toaster />
                  </div>
                </SidebarProvider>
              </LoadingProvider>
            </ThemeProviderServer>
          ) : (
            // Minimal layout for storefront, dashboard, onboarding, and auth routes
            <LoadingProvider>
              <div className="min-h-dvh flex flex-col">
                {children}
                <Toaster />
              </div>
            </LoadingProvider>
          )}
        </HeroUIProviderWrapper>
      </body>
    </html>
  )
}
