import Section from '@/components/Section'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

export default function Page(){
  return (
    <Section title="FAQ" subtitle="Answers to common questions" narrow>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="q1">
          <AccordionTrigger>Can I bring a plus‑one?</AccordionTrigger>
          <AccordionContent>If your invite includes a plus‑one, yes!</AccordionContent>
        </AccordionItem>
        <AccordionItem value="q2">
          <AccordionTrigger>Is there a dress code?</AccordionTrigger>
          <AccordionContent>Black tie with gold accents.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="q3">
          <AccordionTrigger>Are kids welcome?</AccordionTrigger>
          <AccordionContent>Ceremony yes, reception adults only.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </Section>
  )
}
