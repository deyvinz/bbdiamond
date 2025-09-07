import Link from 'next/link';
import Card from '@/components/Card';
import Section from '@/components/Section';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { MotionPage, MotionStagger, MotionItem, MotionCard } from '@/components/ui/motion';
import { Heart, Church, UtensilsCrossed, Calendar, MapPin, Users } from 'lucide-react';

export default function Home() {
  return (
    <MotionPage>
      {/* Hero */}
      <section className="pt-12 md:pt-20">
        <div className="container max-w-6xl">
          <div className="grid items-center gap-8 md:gap-12 md:grid-cols-2">
            <MotionItem className="text-center md:text-left">
              <p className="uppercase tracking-wide text-xs md:text-sm text-black/60">
                You&apos;re invited
              </p>
              <h1 className="mt-2 font-serif text-5xl md:text-6xl leading-tight foil">
                Brenda & Diamond
              </h1>
              <p className="text-sm text-black/70 italic w-full">#BrendaBagsHerDiamond</p>
              <p className="mt-3 md:mt-4 text-black/70">October 16 & 17, 2025 • Lagos, Nigeria</p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 md:justify-start justify-center">
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
              </div>
            </MotionItem>
            <MotionItem>
              <div className="relative overflow-hidden aspect-[4/3] md:aspect-[5/4] rounded-2xl border border-gold-100 shadow-gold bg-white/70 transition-all duration-300 hover:scale-105 hover:rotate-1 active:scale-95">
                <Image
                  src="https://utumylehywfktctigkie.supabase.co/storage/v1/object/public/bdiamond/b-d.jpg"
                  alt="Brenda & Diamond"
                  fill
                  className="object-cover rounded-2xl"
                />
              </div>
            </MotionItem>
          </div>
        </div>
      </section>

      {/* Details */}
      <Section title="Details" subtitle="Everything you need for the big day">
        <MotionStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          <MotionItem>
            <MotionCard>
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <Heart className="h-6 w-6 text-gold-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">Traditional Wedding</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gold-500" />
                      <p className="text-sm text-black/70">October 16, 2025</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-gold-500" />
                      <p className="text-sm text-black/70">Lagos, Nigeria</p>
                    </div>
                    <p className="text-sm text-black/70 mt-2">Dress Code: Black tie • Gold accents</p>
                  </div>
                </div>
              </Card>
            </MotionCard>
          </MotionItem>
          <MotionItem>
            <MotionCard>
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <Church className="h-6 w-6 text-gold-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">Wedding Ceremony</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gold-500" />
                      <p className="text-sm text-black/70">October 17, 2025</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-gold-500" />
                      <p className="text-sm text-black/70">Lagos, Nigeria</p>
                    </div>
                    <p className="text-sm text-black/70 mt-2">Dress Code: Black tie • Gold accents</p>
                  </div>
                </div>
              </Card>
            </MotionCard>
          </MotionItem>
          <MotionItem>
            <MotionCard>
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <UtensilsCrossed className="h-6 w-6 text-gold-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">Wedding Reception</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gold-500" />
                      <p className="text-sm text-black/70">October 17, 2025</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-gold-500" />
                      <p className="text-sm text-black/70">Lagos, Nigeria</p>
                    </div>
                    <p className="text-sm text-black/70 mt-2">Dress Code: Black tie • Gold accents</p>
                  </div>
                </div>
              </Card>
            </MotionCard>
          </MotionItem>
        </MotionStagger>

        <div className="mt-3 rounded-lg bg-gold-50/60 border border-gold-200 px-4 py-3">
          <p className="text-sm text-gold-900 font-medium">
            Kindly note:{' '}
            <span className="font-semibold">White and ivory outfits are not permitted</span> for
            guests. Please choose other colors to let the couple stand out on their special day.
          </p>
        </div>
      </Section>
    </MotionPage>
  );
}
