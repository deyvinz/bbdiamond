'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Card, CardBody, Chip } from '@heroui/react'
import { Layout, Check, Eye } from 'lucide-react'
import { MotionText, MotionFadeIn, MotionSection, MotionStagger } from '@/components/ui/motion'

const templates = [
  { 
    name: 'Elegance', 
    color: 'from-purple-100 to-purple-200',
    style: 'Classic',
    description: 'Elegant and timeless design perfect for traditional celebrations',
    features: ['Classic layout', 'Romantic color palette', 'Elegant typography']
  },
  { 
    name: 'Serenity', 
    color: 'from-blue-100 to-blue-200',
    style: 'Modern',
    description: 'Calm and peaceful aesthetic with minimalist design',
    features: ['Modern layout', 'Soft color scheme', 'Clean typography']
  },
  { 
    name: 'Horpon', 
    color: 'from-amber-100 to-amber-200',
    style: 'Cultural',
    description: 'Celebrate your heritage with culturally-inspired design elements',
    features: ['Cultural motifs', 'Rich color palette', 'Traditional elements']
  },
  { 
    name: 'Botanical', 
    color: 'from-green-100 to-green-200',
    style: 'Modern',
    description: 'Nature-inspired beauty with organic shapes and natural tones',
    features: ['Nature theme', 'Organic layouts', 'Earthy colors']
  },
  { 
    name: 'Ivory', 
    color: 'from-amber-50 to-amber-100',
    style: 'Classic',
    description: 'Soft and romantic with delicate, dreamy aesthetics',
    features: ['Soft palette', 'Romantic feel', 'Elegant details']
  },
  { 
    name: 'Minimal', 
    color: 'from-gray-100 to-gray-200',
    style: 'Minimal',
    description: 'Clean and simple design that lets your content shine',
    features: ['Minimalist design', 'Clean lines', 'Focus on content']
  },
]

const styleFilters = ['All Styles', 'Modern', 'Classic', 'Cultural', 'Minimal']

export default function TemplatesPage() {
  const [selectedStyle, setSelectedStyle] = useState('All Styles')

  const filteredTemplates = selectedStyle === 'All Styles' 
    ? templates 
    : templates.filter(t => t.style === selectedStyle)

  return (
    <div className="min-h-screen bg-[#FDFBF6]">
      {/* Hero Section */}
      <MotionSection className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 px-4 bg-gradient-to-b from-white to-[#FDFBF6]">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <MotionText delay={0.2}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold mb-6 text-[#1E1E1E] tracking-tight">
                Choose Your Perfect Template
              </h1>
            </MotionText>
            <MotionText delay={0.4}>
              <p className="text-lg sm:text-xl md:text-2xl text-[#1E1E1E]/75 mb-8 leading-relaxed">
                Beautiful, professionally designed templates crafted for every style and celebration.
              </p>
            </MotionText>
          </div>
        </div>
      </MotionSection>

      {/* Style Filters */}
      <MotionSection className="py-8 px-4" delay={0.2}>
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {styleFilters.map((style) => (
              <Button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`font-medium transition-all duration-300 ${
                  selectedStyle === style
                    ? 'bg-[#C8A951] text-white shadow-lg'
                    : 'bg-white border-2 border-gray-200 text-[#1E1E1E]/70 hover:border-[#C8A951] hover:text-[#1E1E1E]'
                }`}
                radius="full"
                size="lg"
              >
                {style}
              </Button>
            ))}
          </div>
        </div>
      </MotionSection>

      {/* Templates Grid */}
      <MotionSection className="py-12 sm:py-16 px-4" delay={0.3}>
        <div className="container max-w-7xl mx-auto">
          <MotionStagger delay={0.1}>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredTemplates.map((template, idx) => (
                <MotionFadeIn key={idx} delay={0.1 * idx} direction="up">
                  <Card className="border border-gray-200 shadow-lg rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 bg-white" radius="lg">
                    <CardBody className="p-0">
                      {/* Template Preview */}
                      <div className={`aspect-[4/3] bg-gradient-to-br ${template.color} flex items-center justify-center relative`}>
                        {template.name === 'Elegance' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-8">
                              <div className="text-5xl mb-3">💒</div>
                              <p className="text-[#1E1E1E] font-semibold text-lg">Fanomandi Brekseh</p>
                            </div>
                          </div>
                        )}
                        {template.name === 'Serenity' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-8">
                              <div className="text-5xl mb-3">💕</div>
                              <p className="text-[#1E1E1E] font-semibold text-lg">Your celebration</p>
                            </div>
                          </div>
                        )}
                        {template.name === 'Horpon' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-8">
                              <div className="text-5xl mb-3">🎉</div>
                              <p className="text-[#1E1E1E] font-semibold text-lg">Fegaboom Lu Beatuan</p>
                            </div>
                          </div>
                        )}
                        {template.name === 'Botanical' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-8">
                              <div className="text-5xl mb-3">🌿</div>
                              <p className="text-[#1E1E1E] font-semibold text-lg">We're Getting Married</p>
                            </div>
                          </div>
                        )}
                        {!['Elegance', 'Serenity', 'Horpon', 'Botanical'].includes(template.name) && (
                          <Layout className="h-20 w-20 text-[#1E1E1E]/40" />
                        )}
                        
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/50 transition-colors duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                          <Link href={`/store/templates/${template.name.toLowerCase()}`}>
                            <Button
                              className="bg-white text-[#1E1E1E] font-semibold"
                              radius="lg"
                              startContent={<Eye className="h-4 w-4" />}
                            >
                              Preview Template
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Template Info */}
                      <div className="p-6 sm:p-8">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1E1E1E] mb-2">
                              {template.name}
                            </h3>
                            <Chip 
                              size="sm" 
                              variant="flat"
                              className="bg-[#C8A951]/10 text-[#C8A951] font-medium"
                              radius="full"
                            >
                              {template.style}
                            </Chip>
                          </div>
                        </div>
                        
                        <p className="text-[#1E1E1E]/70 mb-5 text-sm sm:text-base leading-relaxed">
                          {template.description}
                        </p>

                        {/* Features */}
                        <div className="mb-6 space-y-2">
                          {template.features.map((feature, featureIdx) => (
                            <div key={featureIdx} className="flex items-center gap-2 text-sm text-[#1E1E1E]/70">
                              <Check className="h-4 w-4 text-[#C8A951] flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Link href={`/store/templates/${template.name.toLowerCase()}`} className="flex-1">
                            <Button
                              variant="bordered"
                              className="w-full border-2 border-[#1E1E1E] text-[#1E1E1E] rounded-xl font-semibold hover:bg-[#1E1E1E] hover:text-white transition-colors"
                              radius="lg"
                              size="md"
                            >
                              View Demo
                            </Button>
                          </Link>
                          <Link href="/store/signup" className="flex-1">
                            <Button
                              className="w-full bg-[#B6C2A7] text-white rounded-xl font-semibold hover:bg-[#9CA988] transition-colors"
                              radius="lg"
                              size="md"
                            >
                              Use Template
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </MotionFadeIn>
              ))}
            </div>
          </MotionStagger>

          {/* Empty State */}
          {filteredTemplates.length === 0 && (
            <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
              <CardBody className="p-12 text-center">
                <Layout className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#1E1E1E] mb-2">
                  No templates found
                </h3>
                <p className="text-[#1E1E1E]/70 mb-4">
                  Try selecting a different style filter
                </p>
                <Button
                  onClick={() => setSelectedStyle('All Styles')}
                  className="bg-[#C8A951] text-white rounded-xl"
                  radius="lg"
                >
                  View All Templates
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </MotionSection>

      {/* CTA Section */}
      <MotionSection className="py-12 sm:py-16 md:py-20 px-4 bg-gradient-to-br from-[#C8A951] to-[#B38D39] text-white" delay={0.2}>
        <div className="container max-w-4xl mx-auto text-center">
          <MotionText delay={0.3}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-6 leading-[1.2] tracking-tight">
              Can't Find What You're Looking For?
            </h2>
          </MotionText>
          <MotionText delay={0.5}>
            <p className="text-lg sm:text-xl md:text-2xl mb-8 opacity-95 max-w-2xl mx-auto font-light">
              All templates are fully customizable. Start with any template and make it uniquely yours.
            </p>
          </MotionText>
          <MotionFadeIn delay={0.7} direction="up">
            <Link href="/store/signup" className="inline-block">
              <Button 
                className="bg-white text-[#C8A951] text-lg px-10 py-7 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
                radius="lg"
                size="lg"
              >
                Start Creating Free
              </Button>
            </Link>
          </MotionFadeIn>
        </div>
      </MotionSection>
    </div>
  )
}

