import Section from '@/components/Section'
import { Accordion, AccordionItem } from '@heroui/react'
import { Card, CardBody } from '@heroui/react'
import { getAppConfig } from '@/lib/config-service'
import { supabaseServer } from '@/lib/supabase-server'
import { getWeddingId } from '@/lib/wedding-context'

export default async function Page(){
  const weddingId = await getWeddingId()
  const config = await getAppConfig()
  
  if (!weddingId) {
    return (
      <Section title="FAQ" subtitle="Answers to common questions" narrow>
        <Card className="text-center border border-gray-200 shadow-lg rounded-3xl" radius="lg">
          <CardBody className="p-12">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-2">FAQ Unavailable</h3>
            <p className="text-[#1E1E1E]/70">
              Wedding context is required to view the FAQ.
            </p>
          </CardBody>
        </Card>
      </Section>
    )
  }

  const supabase = await supabaseServer()
  const { data: faqItems, error } = await supabase
    .from('faq_items')
    .select('question, answer')
    .eq('wedding_id', weddingId)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching FAQ items:', error)
  }

  // Use database items if available, otherwise fall back to default questions
  const questions = (faqItems && faqItems.length > 0) ? faqItems : [
    {
      question: "Can I bring a plus‑one?",
      answer: config.plus_ones_enabled 
        ? `Yes, you can bring up to ${config.max_party_size - 1} plus-one${config.max_party_size > 2 ? 's' : ''}.`
        : 'No, plus‑ones are not allowed.'
    },
    {
      question: "Is there a dress code?",
      answer: "Dress nice and elegant."
    },
    {
      question: "Are kids welcome?",
      answer: "No, kids are not allowed. Only adults are allowed."
    }
  ]
  
  return (
    <Section title="FAQ" subtitle="Answers to common questions" narrow>
      {questions.length === 0 ? (
        <Card className="text-center border border-gray-200 shadow-lg rounded-3xl" radius="lg">
          <CardBody className="p-12">
            <div className="text-6xl mb-4">❓</div>
            <h3 className="text-xl font-semibold text-[#C8A951] mb-2">FAQ Coming Soon</h3>
            <p className="text-[#1E1E1E]/70">
              We're preparing answers to frequently asked questions. Check back soon!
            </p>
          </CardBody>
        </Card>
      ) : (
        <Accordion selectionMode="single" className="w-full">
          {questions.map((item: { question: string; answer: string }, index: number) => (
            <AccordionItem
              key={`q${index}`}
              aria-label={item.question}
              title={item.question}
              classNames={{
                base: "border border-gray-200 rounded-2xl mb-3",
                title: "text-[#1E1E1E] font-medium",
                trigger: "px-4 py-3",
                content: "px-4 pb-3 text-[#1E1E1E]/70"
              }}
            >
              {item.answer}
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </Section>
  )
}
