'use client'

import Link from 'next/link';
import Card from '@/components/Card';
import Section from '@/components/Section';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { MotionPage, MotionStagger, MotionItem, MotionCard } from '@/components/ui/motion';
import ProtectedEventDetails from '@/components/ProtectedEventDetails';
import { Heart, Church, UtensilsCrossed, Calendar, MapPin, Users } from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';

export default function Home() {
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
              <Image
                  src="/images/logo.png"
                  // "https://utumylehywfktctigkie.supabase.co/storage/v1/object/public/bdiamond/b-d.jpg"
                  alt="Brenda & Diamond"
                  className="object-cover rounded-2xl"
                  width={300}
                  height={300}
                />
            
              <p className="mt-3 md:mt-4 text-black/70">October 16 & 17, 2025 • Lagos, Nigeria</p>
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
                <Link href="/travel">
                  <Button variant="outline" size="lg">
                    Travel & Hotels
                  </Button>
                </Link>
              </div>
            </MotionItem>
          </div>
        </div>
      </section>

      {/* Countdown Timer */}
      <section className="py-12 md:py-16">
        <div className="container max-w-6xl">
          <CountdownTimer 
            targetDate="2025-10-16T00:00:00"
            title="Countdown to Our Wedding"
            subtitle="The big day is approaching!"
          />
        </div>
      </section>

      {/* Protected Event Details */}
      <ProtectedEventDetails onAccessGranted={handleAccessGranted} />
    </MotionPage>
  );
}
