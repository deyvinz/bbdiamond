'use client'

import { Accordion, AccordionItem } from '@heroui/react'
import { useEffect, useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQAccordionProps {
  items: FAQItem[]
  weddingId: string
}

export default function FAQAccordion({ items, weddingId }: FAQAccordionProps) {
  const [primaryColor, setPrimaryColor] = useState('#C8A951')
  const [hoverColor, setHoverColor] = useState('#B38D39')

  // Get theme colors from CSS variables
  useEffect(() => {
    const root = document.documentElement
    const computedPrimary = getComputedStyle(root).getPropertyValue('--color-primary').trim() || '#C8A951'
    const computedGold600 = getComputedStyle(root).getPropertyValue('--color-gold-600').trim() || '#B38D39'
    
    setPrimaryColor(computedPrimary || '#C8A951')
    setHoverColor(computedGold600 || computedPrimary || '#B38D39')
  }, [])

  // Filter out any invalid items
  const validItems = items.filter(
    (item) => item && item.question && item.answer && 
    typeof item.question === 'string' && typeof item.answer === 'string'
  )

  if (validItems.length === 0) {
    return null
  }

  return (
    <>
      <style>{`
        .faq-accordion [data-slot="base"].group:hover {
          border-color: ${primaryColor}30 !important;
        }
        .faq-accordion [data-slot="trigger"][data-hover="true"] {
          background: linear-gradient(to right, ${primaryColor}0D, transparent) !important;
        }
        .faq-accordion [data-slot="indicator"],
        .faq-accordion [data-slot="indicator"] svg {
          color: var(--color-primary, ${primaryColor}) !important;
          transition: transform 200ms ease !important;
        }
        .faq-accordion [data-slot="base"][data-selected="true"] [data-slot="indicator"],
        .faq-accordion [data-slot="base"][data-selected="true"] [data-slot="indicator"] svg,
        .faq-accordion [data-slot="trigger"][aria-expanded="true"] [data-slot="indicator"],
        .faq-accordion [data-slot="trigger"][aria-expanded="true"] [data-slot="indicator"] svg {
          transform: rotate(180deg) !important;
        }
        .faq-accordion [data-slot="base"].group[data-selected="true"] {
          border-color: ${primaryColor}30 !important;
        }
      `}</style>
      <div className="w-full space-y-4 faq-accordion">
        <Accordion 
          selectionMode="single"
          variant="splitted"
          className="w-full gap-4"
          itemClasses={{
            base: "group border border-gray-200/60 rounded-2xl bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300",
            title: "text-[#1E1E1E] font-semibold text-base md:text-lg text-left pr-2",
            trigger: "px-6 py-5 data-[hover=true]:bg-gradient-to-r data-[hover=true]:to-transparent rounded-2xl transition-all duration-200",
            content: "px-6 pb-5 text-[#1E1E1E]/75 leading-relaxed text-sm md:text-base",
            indicator: "transition-transform duration-200",
          }}
        >
          {validItems.map((item, index) => (
            <AccordionItem
              key={`faq-${weddingId}-${index}`}
              aria-label={item.question}
              title={
                <span className="flex items-start gap-3">
                  <span 
                    className="font-semibold mt-1 min-w-[1.5rem]"
                    style={{ color: 'var(--color-primary, #C8A951)' }}
                  >
                    {String(index + 1).padStart(2, '0')}.
                  </span>
                  <span>{item.question}</span>
                </span>
              }
            >
              <div className="pl-11 pr-2">
                <div className="prose prose-sm max-w-none">
                  <p className="text-[#1E1E1E]/75 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  )
}

