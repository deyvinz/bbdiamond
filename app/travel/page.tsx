import Section from '@/components/Section'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MotionPage } from '@/components/ui/motion'
import { 
  MapPin, 
  Phone, 
  Globe, 
  Car, 
  Mail,
  MessageCircle
} from 'lucide-react'
import hotelTravelData from './hotel-travel.json'

export default function TravelPage() {
  const data = hotelTravelData as any
  
  return (
    <MotionPage>
      {/* Hero Section */}
      <section className="pt-12 md:pt-20 pb-8">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gold-800 mb-4">
              {data.title}
            </h1>
            <p className="text-xl text-gold-600 max-w-3xl mx-auto">
              {data.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 pb-16">
        {data.sections.map((section: any) => (
          <Section key={section.id} title={section.title} subtitle={section.description}>
            <div className="grid gap-6">
              {section.items.map((item: any, index: number) => (
                <Card key={index} className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gold-800 mb-2">
                        {item.name}
                      </h3>
                      <p className="text-gold-600 mb-4">
                        {item.description}
                      </p>

                      {/* Address */}
                      {'address' in item && item.address && (
                        <div className="flex items-start gap-2 mb-3">
                          <MapPin className="h-4 w-4 text-gold-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{item.address}</span>
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="flex flex-wrap gap-4 mb-4">
                        {'phone' in item && item.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gold-500" />
                            <span className="text-sm">{item.phone}</span>
                          </div>
                        )}
                        {'website' in item && item.website && (
                          <a 
                            href={item.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                          >
                            <Globe className="h-4 w-4" />
                            <span className="text-sm">Website</span>
                          </a>
                        )}
                      </div>

                      {/* Special Features */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {'distance' in item && item.distance && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {item.distance}
                          </Badge>
                        )}
                        {'specialRate' in item && item.specialRate && (
                          <Badge className="bg-gold-100 text-gold-800">
                            {item.specialRate}
                          </Badge>
                        )}
                        {'priceRange' in item && item.priceRange && (
                          <Badge variant="secondary">
                            {item.priceRange}
                          </Badge>
                        )}
                        {'bookingCode' in item && item.bookingCode && (
                          <Badge variant="outline" className="font-mono">
                            Code: {item.bookingCode}
                          </Badge>
                        )}
                      </div>

                      {/* Amenities */}
                      {'amenities' in item && item.amenities && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Amenities:</h4>
                          <div className="flex flex-wrap gap-1">
                            {item.amenities.map((amenity: any, amenityIndex: number) => (
                              <Badge key={amenityIndex} variant="outline" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Details List */}
                      {'details' in item && item.details && (
                        <div className="mb-4">
                          <ul className="space-y-1">
                            {item.details.map((detail: any, detailIndex: number) => (
                              <li key={detailIndex} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-gold-500 mt-1">•</span>
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Tips */}
                      {'tips' in item && item.tips && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips:</h4>
                          <ul className="space-y-1">
                            {item.tips.map((tip: any, tipIndex: number) => (
                              <li key={tipIndex} className="text-sm text-blue-700 flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Highlights */}
                      {'highlights' in item && item.highlights && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Highlights:</h4>
                          <ul className="space-y-1">
                            {item.highlights.map((highlight: any, highlightIndex: number) => (
                              <li key={highlightIndex} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-gold-500 mt-1">•</span>
                                {highlight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        ))}

        {/* Contact Section */}
        {data.contact && (
          <Section title={data.contact.title} subtitle={data.contact.description}>
            <Card className="p-6 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                  <a 
                    href={`mailto:${data.contact.email}`}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{data.contact.email}</span>
                  </a>
                  <a 
                    href={`https://wa.me/${data.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:text-green-800"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </Card>
          </Section>
        )}
      </div>
    </MotionPage>
  )
}