import Section from '@/components/Section'
import { supabaseServer } from "@/lib/supabase-server";

export default async function Page(){
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('gallery')
    .select('url, caption')
    .order('sort_order', { ascending: true })
  const imgs: { url:string; caption:string }[] = data ?? []

  return (
    <Section title="Gallery" subtitle="Moments we love">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
        {imgs.map((i)=>(
          <div key={i.url} className="aspect-square rounded-md border border-gold-100" />
        ))}
      </div>
    </Section>
  )
}
