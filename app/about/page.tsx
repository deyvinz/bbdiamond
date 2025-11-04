'use client'

import Link from 'next/link'
import { Button, Card, CardBody } from '@heroui/react'
import { Heart, Globe, Sparkles, Users, ArrowRight } from 'lucide-react'
import { MotionText, MotionFadeIn, MotionSection, MotionStagger } from '@/components/ui/motion'

const values = [
  {
    icon: Heart,
    title: 'Love First',
    description: 'We believe every love story deserves to be celebrated beautifully, regardless of culture, tradition, or background.'
  },
  {
    icon: Globe,
    title: 'Global Reach',
    description: 'Built to serve couples worldwide, with support for multiple languages, currencies, and cultural traditions.'
  },
  {
    icon: Sparkles,
    title: 'Excellence',
    description: 'We strive for perfection in every detail, from design to functionality, ensuring your special day is flawless.'
  },
  {
    icon: Users,
    title: 'Community',
    description: 'We\'re more than a platform - we\'re a community of couples helping each other create memorable celebrations.'
  }
]

const team = [
  {
    name: 'Our Team',
    role: 'Wedding Enthusiasts',
    description: 'A passionate group of designers, developers, and wedding lovers dedicated to making your celebration unforgettable.',
    image: '👥'
  }
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF6]">
      {/* Hero Section */}
      <MotionSection className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 px-4 bg-gradient-to-b from-white to-[#FDFBF6]">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <MotionText delay={0.2}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold mb-6 text-[#1E1E1E] tracking-tight">
                About Luwāni
              </h1>
            </MotionText>
            <MotionText delay={0.4}>
              <p className="text-xl sm:text-2xl md:text-3xl text-[#1E1E1E]/75 mb-8 leading-relaxed font-light">
                Celebrating love stories, globally.
              </p>
            </MotionText>
            <MotionText delay={0.6}>
              <p className="text-lg sm:text-xl text-[#1E1E1E]/70 max-w-3xl mx-auto leading-relaxed">
                Luwāni was born from a simple belief: every couple deserves a beautiful, personal way to share their love story with the world. Whether you're planning an intimate ceremony or a grand celebration, our platform helps you create a wedding website that reflects your unique style and culture.
              </p>
            </MotionText>
          </div>
        </div>
      </MotionSection>

      {/* Story Section */}
      <MotionSection className="py-12 sm:py-16 md:py-20 px-4" delay={0.2}>
        <div className="container max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <MotionFadeIn delay={0.3} direction="left">
              <div className="aspect-square bg-gradient-to-br from-[#C8A951]/20 to-[#B6C2A7]/20 rounded-3xl flex items-center justify-center border border-[#1E1E1E]/10">
                <div className="text-center p-8">
                  <div className="text-7xl mb-4">💒</div>
                  <p className="text-[#1E1E1E] font-semibold text-lg">Your Celebration</p>
                </div>
              </div>
            </MotionFadeIn>
            <MotionFadeIn delay={0.4} direction="right">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-6 text-[#1E1E1E] tracking-tight">
                  Our Story
                </h2>
                <div className="space-y-4 text-lg text-[#1E1E1E]/80 leading-relaxed">
                  <p>
                    Founded by wedding enthusiasts who understood the challenges of planning a modern celebration, Luwāni brings together elegant design, powerful features, and cultural sensitivity.
                  </p>
                  <p>
                    We noticed that existing wedding platforms were often generic, lacking the flexibility to represent diverse cultures and traditions. That's why we built Luwāni - a platform that celebrates love in all its beautiful forms.
                  </p>
                  <p>
                    Today, we serve thousands of couples worldwide, helping them create stunning wedding websites that tell their unique stories and welcome guests from near and far.
                  </p>
                </div>
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </MotionSection>

      {/* Mission Section */}
      <MotionSection className="py-12 sm:py-16 md:py-20 px-4 bg-white" delay={0.2}>
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <MotionText delay={0.3}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-6 text-[#1E1E1E] tracking-tight">
                Our Mission
              </h2>
            </MotionText>
            <MotionText delay={0.4}>
              <p className="text-xl sm:text-2xl text-[#1E1E1E]/75 leading-relaxed">
                To empower couples worldwide to create beautiful, personalized wedding websites that honor their love story, culture, and traditions while making planning easier and more joyful.
              </p>
            </MotionText>
          </div>

          {/* Values */}
          <MotionStagger delay={0.5}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, idx) => {
                const IconComponent = value.icon
                return (
                  <MotionFadeIn key={idx} delay={0.1 * idx} direction="up">
                    <Card className="h-full border border-gray-200 shadow-lg rounded-3xl hover:shadow-xl transition-all duration-300 bg-white text-center" radius="lg">
                      <CardBody className="p-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#C8A951]/10 mb-6 mx-auto">
                          <IconComponent className="h-10 w-10 text-[#C8A951]" />
                        </div>
                        <h3 className="text-xl font-semibold text-[#1E1E1E] mb-4">
                          {value.title}
                        </h3>
                        <p className="text-[#1E1E1E]/70 leading-relaxed">
                          {value.description}
                        </p>
                      </CardBody>
                    </Card>
                  </MotionFadeIn>
                )
              })}
            </div>
          </MotionStagger>
        </div>
      </MotionSection>

      {/* Team Section */}
      <MotionSection className="py-12 sm:py-16 md:py-20 px-4" delay={0.2}>
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <MotionText delay={0.3}>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-6 text-[#1E1E1E] tracking-tight">
                The Team Behind Luwāni
              </h2>
            </MotionText>
            <MotionText delay={0.4}>
              <p className="text-lg sm:text-xl text-[#1E1E1E]/75 leading-relaxed">
                We're a diverse team of creatives, technologists, and wedding enthusiasts passionate about making your special day perfect.
              </p>
            </MotionText>
          </div>

          <MotionStagger delay={0.5}>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {team.map((member, idx) => (
                <MotionFadeIn key={idx} delay={0.1 * idx} direction="up">
                  <Card className="border border-gray-200 shadow-lg rounded-3xl hover:shadow-xl transition-all duration-300 bg-white text-center" radius="lg">
                    <CardBody className="p-8">
                      <div className="text-6xl mb-6">{member.image}</div>
                      <h3 className="text-xl font-semibold text-[#1E1E1E] mb-2">
                        {member.name}
                      </h3>
                      <p className="text-[#C8A951] font-medium mb-4">
                        {member.role}
                      </p>
                      <p className="text-[#1E1E1E]/70 leading-relaxed">
                        {member.description}
                      </p>
                    </CardBody>
                  </Card>
                </MotionFadeIn>
              ))}
            </div>
          </MotionStagger>
        </div>
      </MotionSection>

      {/* CTA Section */}
      <MotionSection className="py-12 sm:py-16 md:py-20 px-4 bg-gradient-to-br from-[#C8A951] to-[#B38D39] text-white" delay={0.2}>
        <div className="container max-w-4xl mx-auto text-center">
          <MotionText delay={0.3}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-6 leading-[1.2] tracking-tight">
              Ready to Start Your Journey?
            </h2>
          </MotionText>
          <MotionText delay={0.5}>
            <p className="text-lg sm:text-xl md:text-2xl mb-8 opacity-95 max-w-2xl mx-auto font-light">
              Join thousands of couples celebrating their love story with Luwāni.
            </p>
          </MotionText>
          <MotionFadeIn delay={0.7} direction="up">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/store/signup">
                <Button 
                  className="bg-white text-[#C8A951] text-lg px-10 py-7 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
                  radius="lg"
                  size="lg"
                >
                  Get Started Free
                </Button>
              </Link>
              <Link href="/store/contact">
                <Button 
                  variant="bordered"
                  className="border-2 border-white text-white text-lg px-10 py-7 rounded-2xl font-semibold hover:bg-white/10 transition-all duration-300"
                  radius="lg"
                  size="lg"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </MotionFadeIn>
        </div>
      </MotionSection>
    </div>
  )
}

