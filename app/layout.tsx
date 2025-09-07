import './globals.css'
import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { LoadingProvider } from '@/components/providers/loading-provider'
import { Toaster } from '@/components/ui/toaster'
import PageLoader from '@/components/ui/first-visit-loader'

const inter = Inter({ subsets:['latin'], variable:'--font-inter' })
const playfair = Playfair_Display({ subsets:['latin'], variable:'--font-playfair' })

export const metadata: Metadata = {
  title: 'Our Wedding • White & Gold',
  description: 'Luxury, elegant & exotic wedding website'
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning={true}>
      <body 
        className="antialiased bg-white text-black selection:bg-gold-100/60 selection:text-black"
        suppressHydrationWarning={true}
      >
        <div className="fixed inset-0 -z-10 bg-subtleGrid bg-[length:16px_16px]" />
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
      </body>
    </html>
  )
}
