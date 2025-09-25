import Section from '@/components/Section'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { getAppConfig } from '@/lib/config-service'

export default async function Page(){
  const config = await getAppConfig()
  
  return (
    <Section title="FAQ" subtitle="Answers to common questions" narrow>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="q1">
          <AccordionTrigger>Can I bring a plus‑one?</AccordionTrigger>
          <AccordionContent>
            {config.plus_ones_enabled 
              ? `Yes, you can bring up to ${config.max_party_size - 1} plus-one${config.max_party_size > 2 ? 's' : ''}.`
              : 'No, plus‑ones are not allowed.'
            }
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="q2">
          <AccordionTrigger>Is there a dress code?</AccordionTrigger>
          <AccordionContent>Dress nice and elegant.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="q3">
          <AccordionTrigger>Are kids welcome?</AccordionTrigger>
          <AccordionContent>No, kids are not allowed. Only adults are allowed.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </Section>
  )
}
