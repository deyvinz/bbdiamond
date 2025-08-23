import Section from '@/components/Section'
import Card from '@/components/Card'
import { supabaseServer } from '@/lib/supabase-server'
import { MotionPage, MotionStagger, MotionItem, MotionCard } from '@/components/ui/motion'

export default async function Page(){
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('events')
    .select('name, venue, address, starts_at')
    .order('starts_at', { ascending: true })
  const events: { name:string; venue:string; address:string; starts_at:string }[] = data ?? []

  return (
    <MotionPage>
      <Section title="Schedule" subtitle="Times & locations" narrow>
        <MotionStagger className="relative ml-3 border-s border-gold-100">
          {events.map((i: { name:string; venue:string; address:string; starts_at:string }, idx: number)=>(
            <MotionItem key={idx} className="ms-6 mb-6">
              <span className="absolute -start-1.5 mt-4 h-3 w-3 rounded-full bg-gold-500" />
              <MotionCard>
                <Card>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{i.name}</h3>
                      <p className="text-sm text-black/70">{i.venue} • {i.address}</p>
                    </div>
                    <time className="text-sm">
                      {new Date(i.starts_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </time>
                  </div>
                </Card>
              </MotionCard>
            </MotionItem>
          ))}
        </MotionStagger>
      </Section>
    </MotionPage>
  )
}
