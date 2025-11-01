import Link from 'next/link'
import { Button, Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { Check, Sparkles, Zap, Shield, Globe, Users } from 'lucide-react'

export default function StorePage() {
  const plans = [
    {
      name: 'Basic',
      price: '$29.99',
      period: '/month',
      yearlyPrice: '$299.99',
      description: 'Perfect for intimate weddings',
      features: [
        'Up to 100 guests',
        'Multiple events',
        'RSVP management',
        'Seating charts',
        'Basic templates',
        'Email support'
      ],
      popular: false,
      cta: 'Start Free Trial'
    },
    {
      name: 'Premium',
      price: '$79.99',
      period: '/month',
      yearlyPrice: '$799.99',
      description: 'For couples who want everything',
      features: [
        'Up to 500 guests',
        'Custom domain',
        'Advanced templates',
        'Priority support',
        'Custom branding',
        'Analytics & insights',
        'Everything in Basic'
      ],
      popular: true,
      cta: 'Start Free Trial'
    },
    {
      name: 'Enterprise',
      price: '$199.99',
      period: '/month',
      yearlyPrice: '$1,999.99',
      description: 'For agencies and professionals',
      features: [
        'Unlimited guests',
        'Multiple weddings',
        'White-label option',
        'API access',
        'Dedicated support',
        'Custom integrations',
        'Everything in Premium'
      ],
      popular: false,
      cta: 'Contact Sales'
    }
  ]

  const features = [
    {
      icon: Sparkles,
      title: 'Beautiful Templates',
      description: 'Choose from professionally designed templates or customize your own'
    },
    {
      icon: Zap,
      title: 'Easy to Use',
      description: 'Set up your wedding website in minutes with our intuitive interface'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your guests\' data is protected with enterprise-grade security'
    },
    {
      icon: Globe,
      title: 'Custom Domain',
      description: 'Use your own domain name for a professional look'
    },
    {
      icon: Users,
      title: 'Guest Management',
      description: 'Manage RSVPs, seating charts, and guest communications all in one place'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-default-50">
      {/* Hero Section */}
      <section className="pt-20 pb-12 px-4">
        <div className="container max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            Create Your Perfect Wedding Website
          </h1>
          <p className="text-xl text-default-500 mb-8 max-w-2xl mx-auto">
            Beautiful, customizable wedding websites that your guests will love.
            Set up in minutes, manage everything from one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/store/signup">
              <Button 
                color="primary" 
                size="lg" 
                className="text-lg px-8 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                radius="lg"
              >
                Start Free Trial
              </Button>
            </Link>
            <Link href="/store/demo">
              <Button 
                color="primary" 
                variant="bordered" 
                size="lg" 
                className="text-lg px-8 rounded-2xl font-semibold border-2 hover:bg-primary-50 transition-all duration-300 hover:scale-105"
                radius="lg"
              >
                View Demo
              </Button>
            </Link>
          </div>
          <p className="text-sm text-default-400 mt-4">
            No credit card required • 14-day free trial
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-content1">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-center mb-12">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <Card 
                key={idx} 
                className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-md rounded-3xl" 
                isPressable
                radius="lg"
              >
                <CardBody className="p-8">
                  <div className="bg-primary-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-default-600 leading-relaxed">{feature.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-default-500">
              Choose the plan that's right for your special day
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <div key={idx} className="relative">
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <Chip 
                      color="primary" 
                      size="md"
                      className="font-semibold px-4 py-1.5 shadow-lg"
                      radius="full"
                    >
                      Most Popular
                    </Chip>
                  </div>
                )}
                <Card
                  className={`p-0 transition-all duration-300 hover:scale-105 ${
                    plan.popular
                      ? 'border border-primary shadow-2xl ring-2 ring-primary-100'
                      : 'border border-default-200 shadow-lg hover:shadow-xl'
                  } rounded-3xl overflow-visible`}
                  radius="lg"
                >
                  <div className={`px-8 pb-8 ${plan.popular ? 'pt-10 bg-gradient-to-br from-primary-50 to-primary-100/50' : 'pt-8 bg-content1'}`}>
                  <CardHeader className="text-center mb-6 pb-0 px-0">
                    <div className="w-full">
                      <h3 className="text-2xl font-serif font-bold mb-3 text-foreground">{plan.name}</h3>
                      <p className="text-default-600 mb-6">{plan.description}</p>
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-default-400 text-lg">{plan.period}</span>
                      </div>
                      <p className="text-sm text-default-500 mt-2">
                        or {plan.yearlyPrice}/year (save 17%)
                      </p>
                    </div>
                  </CardHeader>
                  <CardBody className="pt-0 px-0">
                    <ul className="space-y-4 mb-8 min-h-[280px]">
                      {plan.features.map((feature, featureIdx) => (
                        <li key={featureIdx} className="flex items-start gap-3">
                          <div className="bg-primary-100 rounded-full p-1 mt-0.5 flex-shrink-0">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm text-default-700 leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.name === 'Enterprise' ? '/store/contact' : '/store/signup'} className="block">
                      <Button
                        color={plan.popular ? 'primary' : 'default'}
                        variant={plan.popular ? 'solid' : 'bordered'}
                        className={`w-full font-semibold rounded-2xl transition-all duration-300 ${
                          plan.popular 
                            ? 'shadow-lg hover:shadow-xl hover:scale-105' 
                            : 'border-2 hover:bg-default-100'
                        }`}
                        size="lg"
                        radius="lg"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardBody>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        <div className="container max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-10 opacity-95 max-w-2xl mx-auto">
            Join thousands of couples creating beautiful wedding experiences
          </p>
          <Link href="/store/signup">
            <Button 
              color="secondary" 
              size="lg" 
              className="text-lg px-10 py-7 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 bg-white text-primary border-2 border-white hover:border-white/90"
              radius="lg"
            >
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

