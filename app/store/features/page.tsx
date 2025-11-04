'use client'

import Link from 'next/link'
import { Button, Card, CardBody } from '@heroui/react'
import { 
  Monitor, Globe, Mail, Layout, Share2, Calendar, Users, 
  Image as ImageIcon, Gift, MapPin, Bell, Palette, Shield,
  Zap, Smartphone, CheckCircle2, Star
} from 'lucide-react'
import { MotionText, MotionFadeIn, MotionSection, MotionStagger } from '@/components/ui/motion'

const featureCategories = [
  {
    title: 'Website & Templates',
    description: 'Beautiful, professional templates designed for every style',
    features: [
      {
        icon: Layout,
        title: 'Premium Templates',
        description: 'Choose from elegant, modern, classic, and cultural designs that perfectly match your style.'
      },
      {
        icon: Palette,
        title: 'Full Customization',
        description: 'Customize colors, fonts, layouts, and content to make your website uniquely yours.'
      },
      {
        icon: Smartphone,
        title: 'Mobile Responsive',
        description: 'Perfect viewing experience on all devices - phones, tablets, and desktops.'
      },
      {
        icon: ImageIcon,
        title: 'Photo Galleries',
        description: 'Showcase your engagement photos, ceremony, and reception with beautiful galleries.'
      }
    ]
  },
  {
    title: 'Domain & Branding',
    description: 'Make your wedding website truly yours',
    features: [
      {
        icon: Globe,
        title: 'Custom Domain',
        description: 'Use your own domain name (e.g., johnandsarah.com) for a professional presence.'
      },
      {
        icon: Shield,
        title: 'SSL Security',
        description: 'Automatic SSL certificates ensure your site is secure and trusted.'
      },
      {
        icon: Zap,
        title: 'Fast & Reliable',
        description: 'Lightning-fast loading times with 99.9% uptime guarantee.'
      },
      {
        icon: CheckCircle2,
        title: 'Remove Branding',
        description: 'Premium plans include option to remove platform branding for a fully custom look.'
      }
    ]
  },
  {
    title: 'Guest Management',
    description: 'Effortlessly manage your wedding guests',
    features: [
      {
        icon: Users,
        title: 'Guest List Management',
        description: 'Import guests via CSV, organize by groups, and manage RSVPs all in one place.'
      },
      {
        icon: Mail,
        title: 'Digital Invitations',
        description: 'Send beautiful email invitations with RSVP links directly from the platform.'
      },
      {
        icon: Bell,
        title: 'RSVP Reminders',
        description: 'Automatically send reminders to guests who haven\'t responded yet.'
      },
      {
        icon: Calendar,
        title: 'RSVP Tracking',
        description: 'Track responses, meal preferences, dietary restrictions, and plus-ones easily.'
      }
    ]
  },
  {
    title: 'Event Management',
    description: 'Plan and organize every detail',
    features: [
      {
        icon: Calendar,
        title: 'Multiple Events',
        description: 'Create schedules for welcome parties, ceremony, reception, and more.'
      },
      {
        icon: MapPin,
        title: 'Venue Information',
        description: 'Share locations, addresses, parking info, and directions for all events.'
      },
      {
        icon: Users,
        title: 'Seating Charts',
        description: 'Design interactive seating arrangements and assign guests to tables.'
      },
      {
        icon: Gift,
        title: 'Registry Integration',
        description: 'Link to your gift registries from major retailers in one convenient place.'
      }
    ]
  },
  {
    title: 'Additional Features',
    description: 'Everything you need for a perfect wedding website',
    features: [
      {
        icon: ImageIcon,
        title: 'Wedding Party',
        description: 'Introduce your bridal party, groomsmen, and family members with photos and bios.'
      },
      {
        icon: MapPin,
        title: 'Travel & Hotels',
        description: 'Help out-of-town guests with hotel recommendations and travel information.'
      },
      {
        icon: Bell,
        title: 'Announcements',
        description: 'Share important updates and announcements with all your guests instantly.'
      },
      {
        icon: Share2,
        title: 'Social Sharing',
        description: 'Easy sharing on social media to spread the word about your celebration.'
      }
    ]
  }
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF6]">
      {/* Hero Section */}
      <MotionSection className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 px-4 bg-gradient-to-b from-white to-[#FDFBF6]">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <MotionText delay={0.2}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold mb-6 text-[#1E1E1E] tracking-tight">
                Everything You Need for Your Perfect Wedding Website
              </h1>
            </MotionText>
            <MotionText delay={0.4}>
              <p className="text-lg sm:text-xl md:text-2xl text-[#1E1E1E]/75 mb-8 leading-relaxed">
                Powerful features designed to make planning and sharing your special day effortless.
              </p>
            </MotionText>
            <MotionFadeIn delay={0.6} direction="up">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/store/signup">
                  <Button 
                    className="bg-[#C8A951] text-white text-lg px-8 py-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    radius="lg"
                    size="lg"
                  >
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/store#pricing">
                  <Button 
                    variant="bordered"
                    className="border-2 border-[#1E1E1E] text-[#1E1E1E] text-lg px-8 py-6 rounded-2xl font-semibold hover:bg-[#1E1E1E] hover:text-white transition-all duration-300"
                    radius="lg"
                    size="lg"
                  >
                    View Pricing
                  </Button>
                </Link>
              </div>
            </MotionFadeIn>
          </div>
        </div>
      </MotionSection>

      {/* Feature Categories */}
      <div className="py-12 sm:py-16 md:py-20 px-4">
        <div className="container max-w-7xl mx-auto">
          <MotionStagger delay={0.2}>
            {featureCategories.map((category, categoryIdx) => (
              <MotionSection key={categoryIdx} className="mb-16 sm:mb-20 md:mb-24" delay={0.1 * categoryIdx}>
                <div className="mb-12 text-center">
                  <MotionText delay={0.1}>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-4 text-[#1E1E1E] tracking-tight">
                      {category.title}
                    </h2>
                  </MotionText>
                  <MotionText delay={0.2}>
                    <p className="text-lg sm:text-xl text-[#1E1E1E]/70 max-w-2xl mx-auto">
                      {category.description}
                    </p>
                  </MotionText>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                  {category.features.map((feature, featureIdx) => {
                    const IconComponent = feature.icon
                    return (
                      <MotionFadeIn key={featureIdx} delay={0.1 * featureIdx} direction="up">
                        <Card className="h-full border border-gray-200 shadow-lg rounded-3xl hover:shadow-xl transition-all duration-300 bg-white" radius="lg">
                          <CardBody className="p-6 sm:p-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C8A951]/10 mb-6">
                              <IconComponent className="h-8 w-8 text-[#C8A951] stroke-[1.5]" />
                            </div>
                            <h3 className="text-xl font-semibold text-[#1E1E1E] mb-3">
                              {feature.title}
                            </h3>
                            <p className="text-[#1E1E1E]/70 leading-relaxed">
                              {feature.description}
                            </p>
                          </CardBody>
                        </Card>
                      </MotionFadeIn>
                    )
                  })}
                </div>
              </MotionSection>
            ))}
          </MotionStagger>
        </div>
      </div>

      {/* CTA Section */}
      <MotionSection className="py-12 sm:py-16 md:py-20 px-4 bg-gradient-to-br from-[#C8A951] to-[#B38D39] text-white" delay={0.2}>
        <div className="container max-w-4xl mx-auto text-center">
          <MotionText delay={0.3}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-6 leading-[1.2] tracking-tight">
              Ready to Create Your Wedding Website?
            </h2>
          </MotionText>
          <MotionText delay={0.5}>
            <p className="text-lg sm:text-xl md:text-2xl mb-8 opacity-95 max-w-2xl mx-auto font-light">
              Join thousands of couples celebrating their love story with Luwāni. Start your 14-day free trial today.
            </p>
          </MotionText>
          <MotionFadeIn delay={0.7} direction="up">
            <Link href="/store/signup" className="inline-block">
              <Button 
                className="bg-white text-[#C8A951] text-lg px-10 py-7 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
                radius="lg"
                size="lg"
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

