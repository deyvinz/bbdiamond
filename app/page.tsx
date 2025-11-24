import { redirect } from 'next/navigation'
import { getWeddingContext } from '@/lib/wedding-context-server'
import Image from 'next/image'
import { MotionPage, MotionText, MotionSection, MotionFadeIn } from '@/components/ui/motion'
import ProtectedEventDetails from '@/components/ProtectedEventDetails'
import CountdownTimer from '@/components/CountdownTimer'
import HomepageCTAs from '@/components/HomepageCTAs'
import { getWeddingTheme, getDefaultTheme } from '@/lib/theme-service'
import { getAppConfig } from '@/lib/config-service'
import { getHomepageCTAs } from '@/lib/homepage-ctas-service'
import { format } from 'date-fns'

export default async function Home() {
  const context = await getWeddingContext()
  
  // If no wedding context (main platform domain), redirect to store
  if (!context) {
    redirect('/store')
  }

  // If wedding context exists (custom domain/subdomain), show wedding website
  const { wedding } = context
  const theme = await getWeddingTheme(context.weddingId) || getDefaultTheme()
  const config = await getAppConfig(context.weddingId)
  
  // Get customizable CTAs, fallback to defaults if none exist
  const customCTAs = await getHomepageCTAs(context.weddingId)
  
  // Default CTAs (used if no custom CTAs exist)
  const defaultCTAs = [
    { label: 'RSVP', href: '/rsvp', variant: 'primary' as const },
    { label: 'Schedule', href: '/schedule', variant: 'bordered' as const },
    { label: 'Seating', href: '/seating', variant: 'bordered' as const, condition: wedding.enable_seating },
    { label: 'Travel & Hotels', href: '/travel', variant: 'bordered' as const, condition: wedding.enable_travel },
  ]
  
  // Format wedding date
  const weddingDate = new Date(wedding.primary_date)
  const formattedDate = format(weddingDate, 'MMMM d, yyyy')
  const locationText = `${wedding.city}, ${wedding.country}`
  
  // Get logo URL (fallback to default if not set)
  const logoUrl = theme.logo_url || '/images/logo.png'
  const logoAlt = wedding.couple_display_name
  
  return (
    <MotionPage>
      {/* Hero */}
      <MotionSection className="pt-12 md:pt-20" delay={0.1}>
        <div className="container max-w-6xl">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 md:gap-12">
            <div className="text-center flex flex-col items-center justify-center">
              <MotionText delay={0.2}>
                <p className="uppercase tracking-wide text-xs md:text-sm text-black/60 mb-2">
                  You&apos;re invited
                </p>
              </MotionText>
              <MotionFadeIn delay={0.4} direction="up">
                {logoUrl && (
                  <Image
                    src={logoUrl}
                    alt={logoAlt}
                    className="object-cover rounded-2xl w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80"
                    width={300}
                    height={300}
                    priority
                  />
                )}
              </MotionFadeIn>
            
              <MotionText delay={0.6}>
                <p className="mt-3 md:mt-4 text-sm sm:text-base text-black/70 px-4">{formattedDate} • {locationText}</p>
              </MotionText>
              <HomepageCTAs ctas={customCTAs} defaultCTAs={defaultCTAs} />
            </div>
          </div>
        </div>
      </MotionSection>

      {/* Countdown Timer */}
      <MotionSection className="py-12 md:py-16" delay={0.2}>
        <div className="container max-w-6xl">
          <CountdownTimer 
            targetDate={wedding.primary_date}
            title={`Countdown to ${wedding.couple_display_name}'s Wedding`}
            subtitle="The big day is approaching!"
          />
        </div>
      </MotionSection>

      {/* Event Details - Respects config: public if access_code_enabled is false, requires access code if true */}
      <ProtectedEventDetails />
    </MotionPage>
  )
}
