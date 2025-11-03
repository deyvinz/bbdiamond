import { redirect } from 'next/navigation'
import { getWeddingContext } from '@/lib/wedding-context-server'
import Link from 'next/link'
import { Button } from '@heroui/react'
import Image from 'next/image'
import { MotionPage, MotionText, MotionFadeIn, MotionSection } from '@/components/ui/motion'
import ProtectedEventDetails from '@/components/ProtectedEventDetails'
import CountdownTimer from '@/components/CountdownTimer'
import { getWeddingTheme, getDefaultTheme } from '@/lib/theme-service'
import { getAppConfig } from '@/lib/config-service'
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
              <MotionFadeIn delay={0.8} direction="up">
                <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-stretch sm:items-center px-4">
                <Link href="/rsvp" className="w-full sm:w-auto">
                  <Button 
                    color="primary" 
                    size="lg"
                    className="w-full sm:w-auto rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                    radius="lg"
                  >
                    RSVP
                  </Button>
                </Link>
                <Link href="/schedule" className="w-full sm:w-auto">
                  <Button 
                    color="primary" 
                    variant="bordered" 
                    size="lg"
                    className="w-full sm:w-auto rounded-2xl font-semibold border-2 text-primary bg-transparent hover:bg-primary/10 transition-all duration-300 text-sm sm:text-base !bg-transparent"
                    radius="lg"
                    style={{ backgroundColor: 'transparent', color: 'var(--color-primary, var(--heroui-primary))' }}
                  >
                    Schedule
                  </Button>
                </Link>
                <Link href="/seating" className="w-full sm:w-auto">
                  <Button 
                    color="primary" 
                    variant="bordered" 
                    size="lg"
                    className="w-full sm:w-auto rounded-2xl font-semibold border-2 text-primary bg-transparent hover:bg-primary/10 transition-all duration-300 text-sm sm:text-base !bg-transparent"
                    radius="lg"
                    style={{ backgroundColor: 'transparent', color: 'var(--color-primary, var(--heroui-primary))' }}
                  >
                    Seating
                  </Button>
                </Link>
                {wedding.enable_travel && (
                  <Link href="/travel" className="w-full sm:w-auto">
                    <Button 
                      color="primary" 
                      variant="bordered" 
                      size="lg"
                      className="w-full sm:w-auto rounded-2xl font-semibold border-2 text-primary bg-transparent hover:bg-primary/10 transition-all duration-300 text-sm sm:text-base !bg-transparent"
                      radius="lg"
                      style={{ backgroundColor: 'transparent', color: 'var(--color-primary, var(--heroui-primary))' }}
                    >
                      Travel & Hotels
                    </Button>
                  </Link>
                )}
                </div>
              </MotionFadeIn>
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
