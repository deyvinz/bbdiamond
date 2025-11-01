import Link from 'next/link'
import { Button, Card, CardBody } from '@heroui/react'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-default-50 py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold mb-4">
            See It In Action
          </h1>
          <p className="text-xl text-default-500">
            Take a tour of a live wedding website
          </p>
        </div>

        <Card className="mb-8 border-0 shadow-xl rounded-3xl overflow-hidden" radius="lg">
          <CardBody className="p-0">
            <div className="aspect-video bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 rounded-t-3xl mb-6 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-primary/20 [mask-image:linear-gradient(0deg,transparent,black)]"></div>
              <div className="text-center relative z-10">
                <div className="text-7xl mb-4 animate-pulse">💒</div>
                <p className="text-xl font-semibold text-foreground">Demo Wedding Website</p>
                <p className="text-sm text-default-600 mt-2">
                  Interactive preview coming soon
                </p>
              </div>
            </div>
            <div className="px-8 pb-8">

              <div className="space-y-5">
                <h3 className="text-2xl font-semibold text-foreground mb-6">What You'll See:</h3>
                <ul className="space-y-4 text-default-700">
                  <li className="flex items-start gap-3">
                    <div className="bg-primary-100 rounded-full p-1.5 mt-0.5 flex-shrink-0">
                      <span className="text-primary text-lg font-bold">✓</span>
                    </div>
                    <span className="text-base leading-relaxed">Beautiful, customizable homepage</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-primary-100 rounded-full p-1.5 mt-0.5 flex-shrink-0">
                      <span className="text-primary text-lg font-bold">✓</span>
                    </div>
                    <span className="text-base leading-relaxed">Interactive RSVP system</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-primary-100 rounded-full p-1.5 mt-0.5 flex-shrink-0">
                      <span className="text-primary text-lg font-bold">✓</span>
                    </div>
                    <span className="text-base leading-relaxed">Event schedule with details</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-primary-100 rounded-full p-1.5 mt-0.5 flex-shrink-0">
                      <span className="text-primary text-lg font-bold">✓</span>
                    </div>
                    <span className="text-base leading-relaxed">Seating chart visualization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-primary-100 rounded-full p-1.5 mt-0.5 flex-shrink-0">
                      <span className="text-primary text-lg font-bold">✓</span>
                    </div>
                    <span className="text-base leading-relaxed">Photo gallery</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="bg-primary-100 rounded-full p-1.5 mt-0.5 flex-shrink-0">
                      <span className="text-primary text-lg font-bold">✓</span>
                    </div>
                    <span className="text-base leading-relaxed">Mobile-responsive design</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="text-center">
          <Link href="/store/signup">
            <Button 
              color="primary" 
              size="lg" 
              className="text-lg px-10 py-7 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              radius="lg"
            >
              Start Your Free Trial
            </Button>
          </Link>
          <p className="text-sm text-default-500 mt-6">
            Create your own wedding website in minutes
          </p>
        </div>
      </div>
    </div>
  )
}

