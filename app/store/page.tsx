'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { Check, Monitor, Globe, Mail, Layout, Share2, Star, Quote } from 'lucide-react'
import { MotionText, MotionFadeIn, MotionCard, MotionSection, MotionStagger } from '@/components/ui/motion'

export default function StorePage() {
  const [isYearly, setIsYearly] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState('Styles')

  const styleFilters = ['Styles', 'Modern', 'Classic', 'Cultural', 'Minimal']

  const templates = [
    { 
      name: 'Elegance', 
      color: 'from-purple-100 to-purple-200',
      style: 'Classic',
      description: 'Elegant and timeless design'
    },
    { 
      name: 'Serenity', 
      color: 'from-blue-100 to-blue-200',
      style: 'Modern',
      description: 'Calm and peaceful aesthetic'
    },
    { 
      name: 'Horpon', 
      color: 'from-amber-100 to-amber-200',
      style: 'Cultural',
      description: 'Celebrate your heritage'
    },
    { 
      name: 'Botanical', 
      color: 'from-green-100 to-green-200',
      style: 'Modern',
      description: 'Nature-inspired beauty'
    },
    { 
      name: 'Ivory', 
      color: 'from-amber-50 to-amber-100',
      style: 'Classic',
      description: 'Soft and romantic'
    },
    { 
      name: 'Minimal', 
      color: 'from-gray-100 to-gray-200',
      style: 'Minimal',
      description: 'Clean and simple'
    },
  ]

  const featuredTemplates = templates.filter(t => ['Elegance', 'Serenity'].includes(t.name))

  const pricingPlans = [
    {
      name: 'Freemium',
      monthlyPrice: '$0',
      yearlyPrice: '$0',
      description: 'Perfect for trying out',
      features: [
        'Basic templates',
        'Up to 50 guests',
        'RSVP management',
        'Basic support',
        'Luwāni branding'
      ],
      popular: false,
      cta: 'Get Started Free'
    },
    {
      name: 'Standard',
      monthlyPrice: '$29',
      yearlyPrice: '$299',
      description: 'For most couples',
      features: [
        'All templates',
        'Up to 200 guests',
        'Custom domain',
        'Advanced RSVP tools',
        'Email support',
        'Priority updates'
      ],
      popular: true,
      cta: 'Start Free Trial'
    },
    {
      name: 'Premium',
      monthlyPrice: '$79',
      yearlyPrice: '$799',
      description: 'For a perfect celebration',
      features: [
        'All templates',
        'Unlimited guests',
        'Custom domain + SSL',
        'Full customization',
        'Priority support',
        'Analytics dashboard',
        'Remove branding'
      ],
      popular: false,
      cta: 'Start Free Trial'
    },
    {
      name: 'One-Time',
      price: '$299',
      description: 'Pay once, keep forever',
      features: [
        'All Premium features',
        'Lifetime updates',
        'Lifetime support',
        'No monthly fees',
        'Transfer ownership'
      ],
      popular: false,
      cta: 'Buy Now',
      oneTime: true
    }
  ]

  const testimonials = [
    {
      quote: 'Luwāni made our wedding website absolutely stunning. Our guests loved how easy it was to RSVP and see all the details.',
      author: 'Sarah & James',
      location: 'London, UK',
      image: '👰‍♀️💑'
    },
    {
      quote: 'The customization options are incredible. We created a website that perfectly reflected our cultural traditions and style.',
      author: 'Priya & Raj',
      location: 'Mumbai, India',
      image: '👫'
    },
    {
      quote: 'Setting up our website took less than an hour. The templates are beautiful and the support team is amazing.',
      author: 'Maria & Carlos',
      location: 'São Paulo, Brazil',
      image: '💕'
    }
  ]


  return (
    <div className="min-h-screen bg-[#FDFBF6]">
      {/* Hero Section */}
      <MotionSection className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 md:pb-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="text-center md:text-left">
              <MotionText delay={0.2}>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 sm:mb-6 text-[#1E1E1E] leading-[1.1] tracking-tight">
                  Light up your love story
                </h1>
              </MotionText>
              <MotionText delay={0.4}>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#1E1E1E]/75 mb-6 sm:mb-8 md:mb-10 leading-relaxed font-light">
                  Create a personalized wedding website that reflects your culture and style.
                </p>
              </MotionText>
              <MotionFadeIn delay={0.6} direction="up">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start">
                <Link href="/store/signup" className="w-full sm:w-auto">
                  <Button 
                    className="w-full sm:w-auto bg-[#C8A951] text-white text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    radius="lg"
                  >
                    Get Started
                  </Button>
                </Link>
                <Link href="#templates" className="w-full sm:w-auto">
                  <Button 
                    variant="bordered"
                    className="w-full sm:w-auto border-2 border-[#1E1E1E] text-[#1E1E1E] text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-2xl font-semibold hover:bg-[#1E1E1E] hover:text-white transition-all duration-300"
                    radius="lg"
                  >
                    View Templates
                  </Button>
                </Link>
                </div>
              </MotionFadeIn>
            </div>
            <MotionFadeIn delay={0.8} direction="left">
              <div className="relative mt-8 md:mt-0">
                <div className="max-w-sm mx-auto md:max-w-none rounded-2xl sm:rounded-3xl overflow-hidden border border-[#1E1E1E]/10 shadow-2xl">
                  <Image
                    src="/store/luwani-couple-01.jpg"
                    alt="Beautiful couple photo"
                    className="object-cover"
                    quality={95}
                    priority
                    height={700}
                    width={600}
                  />
                </div>
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </MotionSection>

      {/* Featured Templates Section */}
      <MotionSection className="py-12 sm:py-16 px-4 bg-white" delay={0.2}>
        <div className="container max-w-6xl mx-auto">
          <MotionText delay={0.3}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-8 sm:mb-12 text-[#1E1E1E] text-center md:text-left tracking-tight">
              Featured Templates
            </h2>
          </MotionText>
          <MotionStagger delay={0.4}>
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              {featuredTemplates.map((template, idx) => (
                <MotionCard key={idx} index={idx} delay={0.1}>
                  <Card className="border border-gray-200 shadow-lg rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300" radius="lg">
                <CardBody className="p-0">
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
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-serif font-bold text-[#1E1E1E] mb-2">{template.name}</h3>
                    <p className="text-[#1E1E1E]/70 mb-4">{template.description}</p>
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/store/templates/${template.name.toLowerCase()}`}>
                        <Button
                          className="bg-[#B6C2A7] text-white rounded-xl font-semibold hover:bg-[#9CA988] transition-colors"
                          size="md"
                        >
                          View Template
                        </Button>
                      </Link>
                      <Link href="/store/signup">
                        <Button
                          className="bg-[#C8A951] text-white rounded-xl font-semibold hover:bg-[#B38D39] transition-colors"
                          size="md"
                        >
                          Get Started
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardBody>
                  </Card>
                </MotionCard>
              ))}
            </div>
          </MotionStagger>
        </div>
      </MotionSection>

      {/* Features Overview */}
      <MotionSection id="features" className="py-12 sm:py-16 px-4 bg-white" delay={0.2}>
        <div className="container max-w-6xl mx-auto">
          <MotionStagger delay={0.3}>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#C8A951]/10 mb-6">
                <Monitor className="h-10 w-10 text-[#C8A951] stroke-[1.5]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1E1E1E] mb-2">Templates</h3>
              <p className="text-[#1E1E1E]/70">Beautiful, customizable designs</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#C8A951]/10 mb-6">
                <Globe className="h-10 w-10 text-[#C8A951] stroke-[1.5]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1E1E1E] mb-2">Custom Domain</h3>
              <p className="text-[#1E1E1E]/70">Your own unique web address</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#C8A951]/10 mb-6">
                <Mail className="h-10 w-10 text-[#C8A951] stroke-[1.5]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1E1E1E] mb-2">RSVP Tools</h3>
              <p className="text-[#1E1E1E]/70">Easy guest management</p>
            </div>
          </div>
            </MotionStagger>
        </div>
      </MotionSection>

      {/* How It Works */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-[#FDFBF6]">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-center mb-10 sm:mb-12 md:mb-16 text-[#1E1E1E] tracking-tight">
            How It Works
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C8A951] text-white text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#1E1E1E] mb-4">
                Choose a Template
              </h3>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <div className="aspect-[9/16] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-white text-center">
                    <div className="text-sm mb-2">OUR WEDDING</div>
                    <div className="text-lg font-semibold">Laura & Tom</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C8A951] text-white text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#1E1E1E] mb-4">
                Customize
              </h3>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-6 flex items-center justify-center">
                    <span className="text-[#1E1E1E] font-semibold">Elegance</span>
                  </div>
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6 flex items-center justify-center">
                    <span className="text-[#1E1E1E] font-semibold">Serenity</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C8A951] text-white text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#1E1E1E] mb-4">
                Share
              </h3>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 flex items-center justify-center">
                  <Share2 className="h-12 w-12 text-[#C8A951]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Template Library Section */}
      <section id="templates" className="py-12 sm:py-16 md:py-20 px-4 bg-[#FDFBF6]">
        <div className="container max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-6 sm:mb-8 text-[#1E1E1E] tracking-tight">
              Template library
            </h2>
          
          {/* Style Filters */}
          <div className="flex flex-wrap gap-2 sm:gap-4 mb-8 sm:mb-12 pb-4 border-b border-gray-200 overflow-x-auto">
            {styleFilters.map((style) => (
              <button
                key={style}
                onClick={() => setSelectedStyle(style)}
                className={`text-sm sm:text-base font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  selectedStyle === style
                    ? 'bg-[#C8A951] text-white'
                    : 'text-[#1E1E1E]/70 hover:text-[#1E1E1E] hover:bg-gray-100'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {templates
              .filter(t => selectedStyle === 'Styles' || t.style === selectedStyle)
              .map((template, idx) => (
                <Card key={idx} className="border border-gray-200 shadow-lg rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300" radius="lg">
                  <CardBody className="p-0">
                    <div className={`aspect-[4/3] bg-gradient-to-br ${template.color} flex items-center justify-center relative`}>
                      {template.name === 'Elegance' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center p-8">
                            <div className="text-5xl mb-3">💒</div>
                            <p className="text-[#1E1E1E] font-semibold">Fanomandi Brekseh</p>
                          </div>
                        </div>
                      )}
                      {template.name === 'Serenity' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center p-8">
                            <div className="text-5xl mb-3">💕</div>
                            <p className="text-[#1E1E1E] font-semibold">Your celebration</p>
                          </div>
                        </div>
                      )}
                      {template.name === 'Horpon' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center p-8">
                            <div className="text-5xl mb-3">🎉</div>
                            <p className="text-[#1E1E1E] font-semibold">Fegaboom Lu Beatuan</p>
                          </div>
                        </div>
                      )}
                      {template.name === 'Botanical' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center p-8">
                            <div className="text-5xl mb-3">🌿</div>
                            <p className="text-[#1E1E1E] font-semibold">We're Getting Married</p>
                          </div>
                        </div>
                      )}
                      {!['Elegance', 'Serenity', 'Horpon', 'Botanical'].includes(template.name) && (
                        <Layout className="h-20 w-20 text-[#1E1E1E]/40" />
                      )}
                    </div>
                  <div className="p-6 sm:p-8">
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1E1E1E] mb-3">{template.name}</h3>
                    <p className="text-[#1E1E1E]/70 mb-5 text-sm sm:text-base leading-relaxed">{template.description}</p>
                      <div className="flex flex-wrap gap-3">
                        <Link href={`/store/templates/${template.name.toLowerCase()}`}>
                          <Button
                            variant="bordered"
                            className="border-2 border-[#1E1E1E] text-[#1E1E1E] rounded-xl font-semibold hover:bg-[#1E1E1E] hover:text-white transition-colors"
                            size="sm"
                          >
                            View Demo
                          </Button>
                        </Link>
                        <Link href="/store/signup">
                          <Button
                            className="bg-[#B6C2A7] text-white rounded-xl font-semibold hover:bg-[#9CA988] transition-colors"
                            size="sm"
                          >
                            Use Template
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <Link href="/store/signup">
              <Button 
                className="bg-[#B6C2A7] text-white text-lg px-12 py-7 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                radius="lg"
              >
                Start My Wedding Website
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <MotionSection id="pricing" className="py-16 sm:py-20 md:py-24 px-4 bg-gradient-to-b from-[#FDFBF6] to-white" delay={0.2}>
        <div className="container max-w-7xl mx-auto">
          <MotionText delay={0.3}>
            <div className="text-center mb-12 sm:mb-16 md:mb-20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6 sm:mb-8 text-[#1E1E1E] tracking-tight">
                Simple, Transparent Pricing
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-[#1E1E1E]/70 max-w-2xl mx-auto mb-8 sm:mb-10">
                Choose the perfect plan for your special day. All plans include a 14-day free trial.
              </p>
              
              {/* Pill-Style Toggle Switch */}
              <div className="inline-flex flex-col items-center justify-center gap-3 mb-2">
                <div className="relative inline-flex items-center bg-gray-100 rounded-full p-1.5 shadow-inner border border-gray-200">
                  {/* Sliding Pill Indicator */}
                  <div 
                    className={`absolute top-1.5 bottom-1.5 rounded-full bg-[#C8A951] shadow-lg transition-all duration-300 ease-in-out ${
                      isYearly ? 'left-[50%] right-1.5' : 'left-1.5 right-[50%]'
                    }`}
                  />
                  
                  {/* Monthly Button */}
                  <button
                    type="button"
                    onClick={() => setIsYearly(false)}
                    className={`relative z-10 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-colors duration-300 ${
                      !isYearly 
                        ? 'text-white' 
                        : 'text-[#1E1E1E]/70 hover:text-[#1E1E1E]'
                    }`}
                  >
                    Monthly
                  </button>
                  
                  {/* Yearly Button */}
                  <button
                    type="button"
                    onClick={() => setIsYearly(true)}
                    className={`relative z-10 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-colors duration-300 ${
                      isYearly 
                        ? 'text-white' 
                        : 'text-[#1E1E1E]/70 hover:text-[#1E1E1E]'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
                
                {/* Save Badge */}
                {isYearly && (
                  <Chip 
                    size="sm" 
                    className="bg-gradient-to-r from-[#C8A951] to-[#B38D39] text-white font-semibold px-3 py-1 text-xs shadow-lg"
                    radius="full"
                  >
                    Save 17%
                  </Chip>
                )}
              </div>
            </div>
          </MotionText>

          <MotionStagger delay={0.5}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-8">
              {pricingPlans.map((plan, idx) => (
                <MotionCard key={idx} index={idx} delay={0.1}>
                  <div className="relative h-full flex flex-col">
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                        <Chip 
                          className="bg-gradient-to-r from-[#C8A951] to-[#B38D39] text-white font-bold text-xs sm:text-sm px-5 py-2 shadow-xl"
                          radius="full"
                        >
                          Most Popular
                        </Chip>
                      </div>
                    )}
                    <Card
                      className={`h-full flex flex-col p-0 transition-all duration-300 ${
                        plan.popular
                          ? 'border-2 border-[#C8A951] shadow-2xl ring-4 ring-[#C8A951]/10 bg-white'
                          : plan.name === 'Freemium'
                          ? 'border border-gray-200 shadow-lg bg-gradient-to-br from-gray-50 to-white'
                          : 'border border-gray-200 shadow-lg bg-white hover:shadow-xl hover:border-gray-300'
                      } rounded-3xl overflow-visible`}
                      radius="lg"
                    >
                      <div className={`flex-1 flex flex-col ${plan.popular ? 'pt-12 pb-8 px-6 sm:px-8' : 'pt-8 pb-8 px-6 sm:px-8'}`}>
                        {/* Header */}
                        <div className="text-center mb-8">
                          <h3 className={`font-serif font-bold mb-3 text-[#1E1E1E] ${
                            plan.popular 
                              ? 'text-2xl sm:text-3xl' 
                              : 'text-xl sm:text-2xl'
                          }`}>
                            {plan.name}
                          </h3>
                          <p className="text-sm sm:text-base text-[#1E1E1E]/60 mb-6 leading-relaxed">
                            {plan.description}
                          </p>
                          
                          {/* Price */}
                          <div className="flex items-baseline justify-center gap-1.5 mb-4">
                            <span 
                              className={`font-bold text-[#1E1E1E] tracking-tight ${
                                plan.popular
                                  ? 'text-4xl sm:text-5xl'
                                  : 'text-3xl sm:text-4xl'
                              }`}
                              style={{ fontFeatureSettings: '"tnum"' }}
                            >
                              {plan.oneTime ? plan.price : isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                            </span>
                            {!plan.oneTime && (
                              <span className="text-sm sm:text-base text-[#1E1E1E]/50 font-medium">
                                /{isYearly ? 'year' : 'month'}
                              </span>
                            )}
                          </div>
                          {!plan.oneTime && isYearly && plan.yearlyPrice && !plan.yearlyPrice.includes('$0') && (
                            <p className="text-xs sm:text-sm text-[#1E1E1E]/50 mb-2">
                              ${Math.round(parseInt(plan.yearlyPrice.replace('$', '').replace(',', '')) / 12)}/month billed annually
                            </p>
                          )}
                        </div>

                        {/* Features */}
                        <CardBody className="flex-1 p-0 mb-8">
                          <ul className="space-y-4 min-h-[200px] sm:min-h-[240px]">
                            {plan.features.map((feature, featureIdx) => (
                              <li key={featureIdx} className="flex items-start gap-3">
                                <div className={`mt-0.5 flex-shrink-0 rounded-full p-0.5 ${
                                  plan.popular 
                                    ? 'bg-[#C8A951]/10' 
                                    : 'bg-[#C8A951]/5'
                                }`}>
                                  <Check className={`h-4 w-4 ${
                                    plan.popular 
                                      ? 'text-[#C8A951]' 
                                      : 'text-[#C8A951]'
                                  }`} strokeWidth={3} />
                                </div>
                                <span className={`text-[#1E1E1E]/80 leading-relaxed flex-1 ${
                                  plan.popular 
                                    ? 'text-sm sm:text-base' 
                                    : 'text-sm'
                                }`}>
                                  {feature}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </CardBody>

                        {/* CTA Button */}
                        <div className="mt-auto pt-4">
                          <Link href={plan.name === 'One-Time' ? '/store/contact' : '/store/signup'} className="block">
                            <Button
                              className={`w-full font-semibold rounded-2xl transition-all duration-300 ${
                                plan.popular 
                                  ? 'bg-gradient-to-r from-[#C8A951] to-[#B38D39] text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] text-base sm:text-lg py-6 sm:py-7' 
                                  : plan.name === 'Freemium'
                                  ? 'bg-[#1E1E1E] text-white hover:bg-[#1E1E1E]/90 shadow-lg hover:shadow-xl text-base sm:text-lg py-6 sm:py-7'
                                  : 'bg-white border-2 border-gray-300 text-[#1E1E1E] hover:bg-gray-50 hover:border-[#C8A951] text-base sm:text-lg py-6 sm:py-7'
                              }`}
                              size="lg"
                              radius="lg"
                            >
                              {plan.cta}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  </div>
                </MotionCard>
              ))}
            </div>
          </MotionStagger>
          
          {/* Trust Badge */}
          <MotionFadeIn delay={0.9} direction="up">
            <div className="text-center mt-12 sm:mt-16">
              <p className="text-sm sm:text-base text-[#1E1E1E]/60 mb-4">
                All plans include a 14-day free trial • No credit card required • Cancel anytime
              </p>
              <div className="flex items-center justify-center gap-6 sm:gap-8 text-xs sm:text-sm text-[#1E1E1E]/50">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#C8A951]" />
                  <span>SSL Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#C8A951]" />
                  <span>24/7 Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#C8A951]" />
                  <span>Money-Back Guarantee</span>
                </div>
              </div>
            </div>
          </MotionFadeIn>
        </div>
      </MotionSection>

      {/* Testimonials */}
      <MotionSection className="py-12 sm:py-16 md:py-20 px-4 bg-white" delay={0.2}>
        <div className="container max-w-6xl mx-auto">
          <MotionText delay={0.3}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-center mb-10 sm:mb-12 md:mb-16 text-[#1E1E1E] tracking-tight">
              Loved by Couples Worldwide
            </h2>
          </MotionText>
          <MotionStagger delay={0.4}>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              {testimonials.map((testimonial, idx) => (
                <MotionCard key={idx} index={idx} delay={0.1}>
                  <Card className="border border-gray-200 shadow-lg rounded-3xl" radius="lg">
                <CardBody className="p-8">
                  <Quote className="h-8 w-8 text-[#C8A951] mb-4" />
                  <p className="text-[#1E1E1E]/80 mb-6 leading-relaxed italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{testimonial.image}</div>
                    <div>
                      <div className="font-semibold text-[#1E1E1E]">{testimonial.author}</div>
                      <div className="text-sm text-[#1E1E1E]/60">{testimonial.location}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#C8A951] text-[#C8A951]" />
                    ))}
                  </div>
                </CardBody>
                  </Card>
                </MotionCard>
              ))}
            </div>
          </MotionStagger>
        </div>
      </MotionSection>

      {/* CTA Banner */}
      <MotionSection className="py-12 sm:py-16 md:py-20 px-4 bg-gradient-to-br from-[#C8A951] to-[#B38D39] text-white" delay={0.2}>
        <div className="container max-w-4xl mx-auto text-center">
          <MotionText delay={0.3}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-4 sm:mb-6 leading-[1.2] tracking-tight">
              Start your wedding website today — it's free.
            </h2>
          </MotionText>
          <MotionText delay={0.5}>
            <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 md:mb-10 opacity-95 max-w-2xl mx-auto font-light">
              Join thousands of couples celebrating their love story with Luwāni.
            </p>
          </MotionText>
          <MotionFadeIn delay={0.7} direction="up">
            <Link href="/store/signup" className="inline-block">
            <Button 
              className="bg-white text-[#C8A951] text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-7 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 w-full sm:w-auto"
              radius="lg"
            >
              Get Started Free
            </Button>
            </Link>
          </MotionFadeIn>
        </div>
      </MotionSection>
    </div>
  )
}
