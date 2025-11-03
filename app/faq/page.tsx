import Section from '@/components/Section'
import { Card, CardBody } from '@heroui/react'
import { getAppConfig } from '@/lib/config-service'
import { supabaseServer } from '@/lib/supabase-server'
import { getWeddingId } from '@/lib/wedding-context-server'
import FAQAccordion from '@/components/FAQAccordion'

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
  // Ensure all items have question and answer as strings
  const questions = (faqItems && faqItems.length > 0) 
    ? faqItems
        .filter((item: any) => item && item.question && item.answer)
        .map((item: any) => ({
          question: String(item.question || ''),
          answer: String(item.answer || '')
        }))
    : [
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
  
  // Filter out any invalid items before rendering
  const validQuestions = questions.filter(
    (item: { question: string; answer: string }) => item && item.question && item.answer && 
    typeof item.question === 'string' && typeof item.answer === 'string'
  )
  
  return (
    <Section title="Frequently Asked Questions" subtitle="Everything you need to know about our celebration" narrow>
      {validQuestions.length === 0 ? (
        <Card className="text-center border border-gray-200/60 shadow-lg rounded-3xl bg-gradient-to-br from-white to-gray-50/50" radius="lg">
          <CardBody className="p-12 md:p-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#C8A951]/10 to-[#B38D39]/10 mb-6">
              <span className="text-4xl">❓</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-[#1E1E1E] mb-3">FAQ Coming Soon</h3>
            <p className="text-[#1E1E1E]/70 text-base md:text-lg max-w-md mx-auto leading-relaxed">
              We're preparing answers to frequently asked questions. Check back soon!
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="w-full">
          <div className="mb-6 text-center">
            <p className="text-sm text-[#1E1E1E]/60">
              Click on any question below to reveal the answer
            </p>
          </div>
          <Card className="border border-gray-200/60 shadow-xl rounded-3xl bg-gradient-to-br from-white to-gray-50/30 backdrop-blur-sm overflow-hidden" radius="lg">
            <CardBody className="p-6 md:p-8 lg:p-10">
              <FAQAccordion items={validQuestions} weddingId={weddingId} />
            </CardBody>
          </Card>
          <div className="mt-8 text-center">
            <p className="text-sm text-[#1E1E1E]/60">
              Still have questions? <a href="#contact" className="text-[#C8A951] hover:text-[#B38D39] font-medium underline-offset-2 hover:underline transition-colors">Contact us</a>
            </p>
          </div>
        </div>
      )}
    </Section>
  )
}
