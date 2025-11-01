'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input, Card, CardBody, Accordion, AccordionItem } from '@heroui/react'
import { Search, Book, MessageCircle, Video, FileText, ArrowRight } from 'lucide-react'
import { MotionText, MotionFadeIn, MotionSection, MotionStagger } from '@/components/ui/motion'

const faqCategories = [
  {
    title: 'Getting Started',
    icon: Book,
    questions: [
      {
        question: 'How do I create my wedding website?',
        answer: 'Simply sign up for a free account, choose a template that matches your style, and follow our step-by-step onboarding wizard. You can have your website ready in under 10 minutes!'
      },
      {
        question: 'Do I need technical skills to use Luwāni?',
        answer: 'Not at all! Our platform is designed for everyone. No coding or technical knowledge required. Our intuitive interface makes it easy to customize your website.'
      },
      {
        question: 'Can I try Luwāni before purchasing?',
        answer: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required to start your trial.'
      }
    ]
  },
  {
    title: 'Templates & Customization',
    icon: FileText,
    questions: [
      {
        question: 'Can I customize the templates?',
        answer: 'Absolutely! All templates are fully customizable. You can change colors, fonts, layouts, add your own photos, and personalize every detail to match your wedding theme.'
      },
      {
        question: 'How many templates are available?',
        answer: 'We offer a growing collection of professionally designed templates in various styles including elegant, modern, classic, cultural, and minimal designs.'
      },
      {
        question: 'Can I switch templates after creating my website?',
        answer: 'Yes, you can switch templates at any time. Your content will be preserved, though you may need to adjust some formatting to match the new template style.'
      }
    ]
  },
  {
    title: 'Guests & RSVP',
    icon: MessageCircle,
    questions: [
      {
        question: 'How do I manage my guest list?',
        answer: 'You can import guests via CSV file, add them manually, or invite them through our email system. Organize guests by groups, track RSVPs, and manage dietary preferences all in one place.'
      },
      {
        question: 'Can guests RSVP directly on the website?',
        answer: 'Yes! Guests can RSVP directly through your wedding website using their invite code. They can indicate attendance, meal preferences, and dietary restrictions.'
      },
      {
        question: 'How do I send invitations?',
        answer: 'Use our built-in email system to send beautiful digital invitations. You can send invitations individually or in bulk, and track who has received and opened them.'
      }
    ]
  },
  {
    title: 'Domain & Branding',
    icon: FileText,
    questions: [
      {
        question: 'Can I use my own domain name?',
        answer: 'Yes! Premium and Enterprise plans include custom domain support. You can connect your own domain (e.g., johnandsarah.com) to your wedding website.'
      },
      {
        question: 'How do I set up a custom domain?',
        answer: 'During onboarding or in your settings, you can enter your custom domain. We\'ll provide simple DNS instructions to connect it to your website. Our support team is available to help!'
      },
      {
        question: 'Can I remove Luwāni branding?',
        answer: 'Yes, Premium plans and above include the option to remove platform branding for a fully white-label experience.'
      }
    ]
  },
  {
    title: 'Pricing & Plans',
    icon: FileText,
    questions: [
      {
        question: 'What\'s included in the free trial?',
        answer: 'The 14-day free trial includes access to all features and templates. This gives you the full experience to decide if Luwāni is right for your wedding.'
      },
      {
        question: 'Can I upgrade or downgrade my plan?',
        answer: 'Yes, you can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your current billing period.'
      },
      {
        question: 'Do you offer refunds?',
        answer: 'We offer a money-back guarantee within the first 30 days if you\'re not satisfied. Contact our support team for assistance.'
      }
    ]
  },
  {
    title: 'Technical Support',
    icon: Video,
    questions: [
      {
        question: 'What kind of support do you offer?',
        answer: 'We offer email support for all plans, with priority support for Premium and Enterprise customers. Our support team typically responds within 24 hours.'
      },
      {
        question: 'Is my data secure?',
        answer: 'Absolutely. We use industry-standard encryption, secure servers, and regular backups. Your data is protected with SSL certificates and we comply with privacy regulations.'
      },
      {
        question: 'Can I export my data?',
        answer: 'Yes, you can export your guest lists, RSVP data, and other information at any time through your admin dashboard.'
      }
    ]
  }
]

const quickLinks = [
  {
    title: 'Getting Started Guide',
    description: 'Step-by-step tutorial for new users',
    href: '/help/getting-started',
    icon: Book
  },
  {
    title: 'Video Tutorials',
    description: 'Watch video guides and walkthroughs',
    href: '/help/videos',
    icon: Video
  },
  {
    title: 'Contact Support',
    description: 'Get help from our support team',
    href: '/store/contact',
    icon: MessageCircle
  }
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  return (
    <div className="min-h-screen bg-[#FDFBF6]">
      {/* Hero Section */}
      <MotionSection className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 px-4 bg-gradient-to-b from-white to-[#FDFBF6]">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <MotionText delay={0.2}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold mb-6 text-[#1E1E1E] tracking-tight">
                How Can We Help?
              </h1>
            </MotionText>
            <MotionText delay={0.4}>
              <p className="text-lg sm:text-xl md:text-2xl text-[#1E1E1E]/75 mb-8 leading-relaxed">
                Find answers to common questions or get in touch with our support team.
              </p>
            </MotionText>
            <MotionFadeIn delay={0.6} direction="up">
              <div className="relative max-w-2xl mx-auto">
                <Input
                  placeholder="Search for help..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startContent={<Search className="h-5 w-5 text-gray-400" />}
                  classNames={{
                    input: "rounded-xl",
                    inputWrapper: "border-2 border-gray-200 hover:border-[#C8A951]/50 focus-within:border-[#C8A951] rounded-xl transition-colors bg-white shadow-lg",
                  }}
                  radius="lg"
                  size="lg"
                />
              </div>
            </MotionFadeIn>
          </div>

          {/* Quick Links */}
          <MotionStagger delay={0.8}>
            <div className="grid sm:grid-cols-3 gap-6 mb-16">
              {quickLinks.map((link, idx) => {
                const IconComponent = link.icon
                return (
                  <MotionFadeIn key={idx} delay={0.1 * idx} direction="up">
                    <Link href={link.href}>
                      <Card className="border border-gray-200 shadow-lg rounded-3xl hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white cursor-pointer" radius="lg">
                        <CardBody className="p-6">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C8A951]/10 mb-4">
                            <IconComponent className="h-8 w-8 text-[#C8A951]" />
                          </div>
                          <h3 className="text-lg font-semibold text-[#1E1E1E] mb-2">
                            {link.title}
                          </h3>
                          <p className="text-sm text-[#1E1E1E]/70 mb-4">
                            {link.description}
                          </p>
                          <div className="flex items-center text-[#C8A951] font-medium text-sm">
                            Learn more <ArrowRight className="h-4 w-4 ml-2" />
                          </div>
                        </CardBody>
                      </Card>
                    </Link>
                  </MotionFadeIn>
                )
              })}
            </div>
          </MotionStagger>
        </div>
      </MotionSection>

      {/* FAQ Sections */}
      <MotionSection className="py-12 sm:py-16 px-4" delay={0.2}>
        <div className="container max-w-5xl mx-auto">
          {filteredCategories.length === 0 ? (
            <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
              <CardBody className="p-12 text-center">
                <p className="text-lg text-[#1E1E1E]/70 mb-4">
                  No results found for "{searchQuery}"
                </p>
                <Button
                  onClick={() => setSearchQuery('')}
                  className="bg-[#C8A951] text-white rounded-xl"
                  radius="lg"
                >
                  Clear Search
                </Button>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-12">
              {filteredCategories.map((category, categoryIdx) => {
                const IconComponent = category.icon
                return (
                  <MotionFadeIn key={categoryIdx} delay={0.1 * categoryIdx} direction="up">
                    <div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#C8A951]/10">
                          <IconComponent className="h-6 w-6 text-[#C8A951]" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E1E1E]">
                          {category.title}
                        </h2>
                      </div>
                      <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
                        <CardBody className="p-0">
                          <Accordion
                            selectedKeys={expandedKeys}
                            onSelectionChange={(keys) => setExpandedKeys(keys as Set<string>)}
                            variant="splitted"
                            itemClasses={{
                              base: "px-6",
                              title: "text-[#1E1E1E] font-semibold",
                              trigger: "py-4",
                              content: "text-[#1E1E1E]/70 pb-4",
                            }}
                          >
                            {category.questions.map((faq, faqIdx) => (
                              <AccordionItem
                                key={`${categoryIdx}-${faqIdx}`}
                                aria-label={faq.question}
                                title={faq.question}
                              >
                                {faq.answer}
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </CardBody>
                      </Card>
                    </div>
                  </MotionFadeIn>
                )
              })}
            </div>
          )}
        </div>
      </MotionSection>

      {/* CTA Section */}
      <MotionSection className="py-12 sm:py-16 md:py-20 px-4 bg-gradient-to-br from-[#C8A951] to-[#B38D39] text-white" delay={0.2}>
        <div className="container max-w-4xl mx-auto text-center">
          <MotionText delay={0.3}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-6 leading-[1.2] tracking-tight">
              Still Need Help?
            </h2>
          </MotionText>
          <MotionText delay={0.5}>
            <p className="text-lg sm:text-xl md:text-2xl mb-8 opacity-95 max-w-2xl mx-auto font-light">
              Our support team is here to help. Contact us and we'll get back to you as soon as possible.
            </p>
          </MotionText>
          <MotionFadeIn delay={0.7} direction="up">
            <Link href="/store/contact" className="inline-block">
              <Button 
                className="bg-white text-[#C8A951] text-lg px-10 py-7 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
                radius="lg"
                size="lg"
              >
                Contact Support
              </Button>
            </Link>
          </MotionFadeIn>
        </div>
      </MotionSection>
    </div>
  )
}

