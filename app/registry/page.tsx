import Section from '@/components/Section'
import { Card, CardBody, Button } from '@heroui/react'
import { supabaseServer } from '@/lib/supabase-server'
import { getWeddingId } from '@/lib/wedding-context'

export default async function Page(){
  const weddingId = await getWeddingId()
  
  if (!weddingId) {
    return (
      <Section
        title="Registry"
        subtitle="Your presence is the greatest gift, but if you wish to give, cash gifts are warmly appreciated."
      >
        <Card className="text-center border border-gray-200 shadow-lg rounded-3xl" radius="lg">
          <CardBody className="p-12">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-2">Registry Unavailable</h3>
            <p className="text-[#1E1E1E]/70">
              Wedding context is required to view the registry.
            </p>
          </CardBody>
        </Card>
      </Section>
    )
  }

  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('registries')
    .select('title, description, url')
    .eq('wedding_id', weddingId)
    .order('priority', { ascending: true })
  const items: { title:string; description:string; url:string }[] = data ?? []

  return (
    <Section
      title="Registry"
      subtitle="Your presence is the greatest gift, but if you wish to give, cash gifts are warmly appreciated."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {items.map((it) => (
          <Card key={it.title} className="border border-gray-200 shadow-md rounded-2xl" radius="lg">
            <CardBody className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-[#1E1E1E] mb-1">{it.title}</h3>
                  <p className="text-sm text-[#1E1E1E]/70">{it.description}</p>
                </div>
                {it.url?.trim() && (
                  <Button
                    as="a"
                    href={it.url.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="bordered"
                    className="border-[#C8A951] text-[#C8A951] hover:bg-[#C8A951]/10 flex-shrink-0"
                    radius="lg"
                    size="sm"
                  >
                    Open
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </Section>
  )
}
