import { Card, CardBody } from '@heroui/react'

export default function Page(){
    return (
      <section className="container py-12 md:py-20">
        <h1 className="text-4xl md:text-5xl font-serif mb-3 text-[#1E1E1E]">Contact Us</h1>
        <p className="text-[#1E1E1E]/70 mb-6">Questions? Send us a note below.</p>
        <Card className="border border-gray-200 shadow-lg rounded-2xl overflow-hidden" radius="lg">
          <CardBody className="p-0">
            <iframe
              className="w-full h-[1200px]"
              src="https://forms.gle/rP9UnFrMNPriUEZp8"
              title="Contact Form"
            />
          </CardBody>
        </Card>
      </section>
    )
  }
  