import './globals.css'
import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { LoadingProvider } from '@/components/providers/loading-provider'
import { Toaster } from '@/components/ui/toaster'
import PageLoader from '@/components/ui/first-visit-loader'
import { ThemeProviderServer } from '@/components/ThemeProvider'
import { getWeddingContext } from '@/lib/wedding-context'
import { getWeddingTheme, getDefaultTheme } from '@/lib/theme-service'
import { getGoogleFontsURL } from '@/lib/theme-service'

export async function generateMetadata(): Promise<Metadata> {
  const context = await getWeddingContext()
  
  if (context) {
    return {
      title: context.wedding.couple_display_name || `${context.wedding.bride_name} & ${context.wedding.groom_name}`,
      description: `Wedding celebration for ${context.wedding.couple_display_name}`,
      keywords: context.wedding.hashtag || `${context.wedding.bride_name} ${context.wedding.groom_name} wedding`,
    }
  }

  // Fallback metadata
  return {
    title: 'Wedding Celebration',
    description: 'Join us for a special celebration',
  }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const context = await getWeddingContext()
  const weddingId = context?.weddingId
  
  // Get theme for dynamic fonts
  let theme = getDefaultTheme()
  if (weddingId) {
    const fetchedTheme = await getWeddingTheme(weddingId)
    if (fetchedTheme) {
      theme = fetchedTheme
    }
  }

  // Dynamically load fonts based on theme
  const fontsURL = getGoogleFontsURL(theme)
  
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
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
        }}
      >
        <div className="fixed inset-0 -z-10 bg-subtleGrid bg-[length:16px_16px]" />
        {weddingId ? (
          <ThemeProviderServer weddingId={weddingId}>
            <LoadingProvider>
              <SidebarProvider>
                <div className="min-h-dvh flex flex-col animate-in fade-in duration-500">
                  <PageLoader />
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
          <LoadingProvider>
            <SidebarProvider>
              <div className="min-h-dvh flex flex-col animate-in fade-in duration-500">
                <PageLoader />
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
        )}
      </body>
    </html>
  )
}
