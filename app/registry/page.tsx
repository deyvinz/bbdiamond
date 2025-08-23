import Section from '@/components/Section'
import Card from '@/components/Card'
import { supabaseServer } from '@/lib/supabase-server'

export default async function Page(){
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('registries')
    .select('title, description, url')
    .order('priority', { ascending: true })
  const items: { title:string; description:string; url:string }[] = data ?? []

  return (
    <Section title="Registry" subtitle="Your love is enough—gifts optional">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.map((it)=>(
          <Card key={it.title}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-medium">{it.title}</h3>
                <p className="text-sm text-black/70">{it.description}</p>
              </div>
              <a className="px-4 py-2 border border-gold-500 hover:bg-gold-50 rounded-md" href={it.url}>Open</a>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  )
}
