import Link from 'next/link';
import Card from '@/components/Card';
import Section from '@/components/Section';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { MotionPage, MotionStagger, MotionItem, MotionCard } from '@/components/ui/motion';
import ProtectedEventDetails from '@/components/ProtectedEventDetails';
import { Heart, Church, UtensilsCrossed, Calendar, MapPin, Users } from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';
import { getWeddingContext } from '@/lib/wedding-context';
import { getWeddingTheme, getDefaultTheme } from '@/lib/theme-service';
import { format } from 'date-fns';

export default async function Home() {
  const context = await getWeddingContext()
  
  if (!context) {
    return (
      <MotionPage>
        <section className="pt-12 md:pt-20">
          <div className="container max-w-6xl">
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
              <h1 className="text-2xl font-bold">No wedding found</h1>
              <p className="text-muted-foreground">Please configure your wedding settings.</p>
            </div>
          </div>
        </section>
      </MotionPage>
    )
  }

  const { wedding } = context
  const theme = await getWeddingTheme(context.weddingId) || getDefaultTheme()
  
  // Format wedding date
  const weddingDate = new Date(wedding.primary_date)
  const formattedDate = format(weddingDate, 'MMMM d, yyyy')
  const locationText = `${wedding.city}, ${wedding.country}`
  
  // Get logo URL (fallback to default if not set)
  const logoUrl = theme.logo_url || '/images/logo.png'
  const logoAlt = wedding.couple_display_name

  const handleAccessGranted = (guest: any) => {
    // This function is called when a guest successfully authenticates
    // We can add any additional logic here if needed
    console.log('Guest authenticated:', guest.first_name)
  }

  return (
    <MotionPage>
      {/* Hero */}
      <section className="pt-12 md:pt-20">
        <div className="container max-w-6xl">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 md:gap-12">
            <MotionItem className="text-center flex flex-col items-center justify-center">
              <p className="uppercase tracking-wide text-xs md:text-sm text-black/60">
                You&apos;re invited
              </p>
              {logoUrl && (
                <Image
                  src={logoUrl}
                  alt={logoAlt}
                  className="object-cover rounded-2xl"
                  width={300}
                  height={300}
                />
              )}
            
              <p className="mt-3 md:mt-4 text-black/70">{formattedDate} • {locationText}</p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/rsvp">
                  <Button variant="gold" size="lg">
                    RSVP
                  </Button>
                </Link>
                <Link href="/schedule">
                  <Button variant="outline" size="lg">
                    Schedule
                  </Button>
                </Link>
                <Link href="/seating">
                  <Button variant="outline" size="lg">
                    Seating
                  </Button>
                </Link>
                {wedding.enable_travel && (
                  <Link href="/travel">
                    <Button variant="outline" size="lg">
                      Travel & Hotels
                    </Button>
                  </Link>
                )}
              </div>
            </MotionItem>
          </div>
        </div>
      </section>

      {/* Countdown Timer */}
      <section className="py-12 md:py-16">
        <div className="container max-w-6xl">
          <CountdownTimer 
            targetDate={wedding.primary_date}
            title={`Countdown to ${wedding.couple_display_name}'s Wedding`}
            subtitle="The big day is approaching!"
          />
        </div>
      </section>

      {/* Protected Event Details */}
      <ProtectedEventDetails onAccessGranted={handleAccessGranted} />
    </MotionPage>
  );
}
