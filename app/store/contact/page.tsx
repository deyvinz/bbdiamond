'use client'

import { useState } from 'react'
import { Button } from '@heroui/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardBody, CardHeader } from '@heroui/react'
import { Mail, Phone, MessageSquare, Send, CheckCircle2 } from 'lucide-react'
import { MotionText, MotionFadeIn, MotionSection } from '@/components/ui/motion'
import { useToast } from '@/components/ui/use-toast'

export default function ContactPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Create API route to handle contact form submission
      // For now, just show success message
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: 'Message sent!',
        description: 'We\'ll get back to you within 24 hours.',
      })
      
      setSubmitted(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF6]">
      {/* Hero Section */}
      <MotionSection className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 px-4 bg-gradient-to-b from-white to-[#FDFBF6]">
        <div className="container max-w-4xl mx-auto text-center">
          <MotionText delay={0.2}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold mb-6 text-[#1E1E1E] tracking-tight">
              Get In Touch
            </h1>
          </MotionText>
          <MotionText delay={0.4}>
            <p className="text-lg sm:text-xl md:text-2xl text-[#1E1E1E]/75 mb-8 leading-relaxed">
              Have questions? We're here to help. Send us a message and we'll respond as soon as possible.
            </p>
          </MotionText>
        </div>
      </MotionSection>

      {/* Contact Section */}
      <MotionSection className="py-12 sm:py-16 px-4" delay={0.2}>
        <div className="container max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Contact Info Cards */}
            <MotionFadeIn delay={0.3} direction="up">
              <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
                <CardBody className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C8A951]/10 mb-4">
                    <Mail className="h-8 w-8 text-[#C8A951]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1E1E1E] mb-2">Email Us</h3>
                  <p className="text-[#1E1E1E]/70 text-sm">
                    <a href="mailto:hello@luwani.com" className="hover:text-[#C8A951] transition-colors">
                      hello@luwani.com
                    </a>
                  </p>
                </CardBody>
              </Card>
            </MotionFadeIn>

            <MotionFadeIn delay={0.4} direction="up">
              <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
                <CardBody className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C8A951]/10 mb-4">
                    <Phone className="h-8 w-8 text-[#C8A951]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1E1E1E] mb-2">Call Us</h3>
                  <p className="text-[#1E1E1E]/70 text-sm">
                    <a href="tel:+1234567890" className="hover:text-[#C8A951] transition-colors">
                      +1 (234) 567-8900
                    </a>
                  </p>
                </CardBody>
              </Card>
            </MotionFadeIn>

            <MotionFadeIn delay={0.5} direction="up">
              <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
                <CardBody className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C8A951]/10 mb-4">
                    <MessageSquare className="h-8 w-8 text-[#C8A951]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1E1E1E] mb-2">Response Time</h3>
                  <p className="text-[#1E1E1E]/70 text-sm">
                    We typically respond within 24 hours
                  </p>
                </CardBody>
              </Card>
            </MotionFadeIn>
          </div>

          {/* Contact Form */}
          <MotionFadeIn delay={0.6} direction="up">
            <Card className="border border-gray-200 shadow-xl rounded-3xl bg-white" radius="lg">
              <CardHeader className="pb-4 pt-8 px-8">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E1E1E]">
                  Send Us a Message
                </h2>
              </CardHeader>
              <CardBody className="px-8 pb-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#C8A951]/10 mb-6">
                      <CheckCircle2 className="h-10 w-10 text-[#C8A951]" />
                    </div>
                    <h3 className="text-2xl font-semibold text-[#1E1E1E] mb-3">
                      Thank You!
                    </h3>
                    <p className="text-[#1E1E1E]/70 mb-6">
                      We've received your message and will get back to you soon.
                    </p>
                    <Button
                      onClick={() => setSubmitted(false)}
                      className="bg-[#C8A951] text-white rounded-xl font-semibold"
                      radius="lg"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          type="text"
                          required
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={6}
                        className="rounded-xl resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      isLoading={loading}
                      className="w-full bg-[#C8A951] text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                      size="lg"
                      radius="lg"
                      startContent={!loading && <Send className="h-5 w-5" />}
                    >
                      {loading ? 'Sending...' : 'Send Message'}
                    </Button>
                  </form>
                )}
              </CardBody>
            </Card>
          </MotionFadeIn>
        </div>
      </MotionSection>
    </div>
  )
}

