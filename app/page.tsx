import Link from 'next/link'
import Card from '@/components/Card'
import Section from '@/components/Section'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { MotionPage, MotionStagger, MotionItem, MotionCard } from '@/components/ui/motion'

export default function Home() {
  return (
    <MotionPage>
      {/* Hero */}
      <section className="pt-12 md:pt-20">
        <div className="container max-w-6xl">
          <div className="grid items-center gap-8 md:gap-12 md:grid-cols-2">
            <MotionItem className="text-center md:text-left">
              <p className="uppercase tracking-wide text-xs md:text-sm text-black/60">You're invited</p>
              <h1 className="mt-2 font-serif text-5xl md:text-6xl leading-tight foil">Brenda & Diamond</h1>
              <p className="mt-3 md:mt-4 text-black/70">October 16 & 17, 2025 • Lagos, Nigeria</p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 md:justify-start justify-center">
                <Link href="/rsvp"><Button variant="gold" size="lg">RSVP</Button></Link>
                <Link href="/schedule"><Button variant="outline" size="lg">Schedule</Button></Link>
              </div>
            </MotionItem>
            <MotionItem>
              <div className="relative overflow-hidden aspect-[4/3] md:aspect-[5/4] rounded-2xl border border-gold-100 shadow-gold bg-white/70">
                <Image src="https://utumylehywfktctigkie.supabase.co/storage/v1/object/public/bdiamond/b-d.jpg" alt="Brenda & Diamond" fill className="object-cover rounded-2xl" />
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
              <Card><h3 className="font-medium">Ceremony</h3><p className="text-sm text-black/70">2:30 PM • Notre‑Dame</p></Card>
            </MotionCard>
          </MotionItem>
          <MotionItem>
            <MotionCard>
              <Card><h3 className="font-medium">Reception</h3><p className="text-sm text-black/70">6:00 PM • Ritz</p></Card>
            </MotionCard>
          </MotionItem>
          <MotionItem>
            <MotionCard>
              <Card><h3 className="font-medium">Dress Code</h3><p className="text-sm text-black/70">Black tie • Gold accents</p></Card>
            </MotionCard>
          </MotionItem>
        </MotionStagger>
      </Section>
    </MotionPage>
  )
}
