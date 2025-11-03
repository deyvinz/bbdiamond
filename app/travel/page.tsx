import Section from '@/components/Section'
import { Card, CardBody, Button, Chip } from '@heroui/react'
import { MotionPage } from '@/components/ui/motion'
import { 
  MapPin, 
  Phone, 
  Globe, 
  Car, 
  Mail,
} from 'lucide-react'
import { supabaseServer } from '@/lib/supabase-server'
import { getWeddingId, getWeddingContext } from '@/lib/wedding-context-server'

export default async function TravelPage() {
  const weddingId = await getWeddingId()
  const context = await getWeddingContext()
  
  if (!weddingId || !context) {
    return (
      <MotionPage>
        <section className="pt-12 md:pt-20 pb-8">
          <div className="container max-w-6xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gold-800 mb-4">
                Hotel & Travel Information
              </h1>
              <p className="text-xl text-gold-600 max-w-3xl mx-auto">
                Wedding context is required to view travel information.
              </p>
            </div>
          </div>
        </section>
      </MotionPage>
    )
  }

  const supabase = await supabaseServer()
  
  // Fetch sections
  const { data: sections, error: sectionsError } = await supabase
    .from('travel_info_sections')
    .select('id, section_type, title, description, display_order')
    .eq('wedding_id', weddingId)
    .order('display_order', { ascending: true })

  if (sectionsError) {
    console.error('Error fetching travel sections:', sectionsError)
  }

  // Fetch items for all sections
  const sectionIds = (sections || []).map((s: { id: string }) => s.id)
  let items: any[] = []
  if (sectionIds.length > 0) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('travel_info_items')
      .select('*')
      .in('section_id', sectionIds)
      .order('display_order', { ascending: true })
    
    if (itemsError) {
      console.error('Error fetching travel items:', itemsError)
    } else {
      items = itemsData || []
    }
  }

  // Transform data to match component expectations
  const transformedSections = (sections || []).map((section: { id: string; section_type: string; title: string; description: string | null }) => ({
    id: section.section_type,
    title: section.title,
    description: section.description,
    items: (items || [])
      .filter(item => item.section_id === section.id)
      .map(item => ({
        name: item.name,
        description: item.description || '',
        address: item.address || '',
        phone: item.phone || '',
        website: item.website || '',
        details: (item.details as string[]) || [],
        tips: (item.tips as string[]) || [],
        ...(item.details && Array.isArray(item.details) && item.details.length > 0 ? { details: item.details } : {}),
        ...(item.tips && Array.isArray(item.tips) && item.tips.length > 0 ? { tips: item.tips } : {})
      }))
  }))

  const data = {
    title: "Hotel & Travel Information",
    subtitle: `Everything you need to know for your stay in ${context.wedding.city}`,
    sections: transformedSections,
    contact: context.wedding.contact_email ? {
      title: "Need Help?",
      description: "Our wedding coordinators are here to assist you",
      email: context.wedding.contact_email
    } : null
  }
  
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
        {data.sections.length === 0 ? (
          <Card className="text-center border border-gray-200 shadow-lg rounded-3xl" radius="lg">
            <CardBody className="p-12">
              <div className="text-6xl mb-4">✈️</div>
              <h3 className="text-xl font-semibold text-[#C8A951] mb-2">Travel Information Coming Soon</h3>
              <p className="text-[#1E1E1E]/70">
                We're preparing travel information for our guests. Check back soon!
              </p>
            </CardBody>
          </Card>
        ) : (
          data.sections.map((section: any) => (
          <Section key={section.id} title={section.title} subtitle={section.description}>
            <div className="grid gap-6">
              {section.items.map((item: any, index: number) => (
                <Card key={index} className="border border-gray-200 shadow-md rounded-2xl" radius="lg">
                  <CardBody className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-[#1E1E1E] mb-2">
                          {item.name}
                        </h3>
                        <p className="text-[#1E1E1E]/70 mb-4">
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
                            <Phone className="h-4 w-4 text-[#C8A951]" />
                            <span className="text-sm text-[#1E1E1E]/70">{item.phone}</span>
                          </div>
                        )}
                        {'website' in item && item.website && (
                          <Button
                            as="a"
                            href={item.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="light"
                            size="sm"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                            startContent={<Globe className="h-4 w-4" />}
                          >
                            Website
                          </Button>
                        )}
                      </div>

                      {/* Special Features */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {'distance' in item && item.distance && (
                          <Chip variant="bordered" className="flex items-center gap-1" startContent={<Car className="h-3 w-3" />}>
                            {item.distance}
                          </Chip>
                        )}
                        {'specialRate' in item && item.specialRate && (
                          <Chip className="bg-[#C8A951]/10 text-[#C8A951] border border-[#C8A951]/20">
                            {item.specialRate}
                          </Chip>
                        )}
                        {'priceRange' in item && item.priceRange && (
                          <Chip variant="flat" color="default">
                            {item.priceRange}
                          </Chip>
                        )}
                        {'bookingCode' in item && item.bookingCode && (
                          <Chip variant="bordered" className="font-mono">
                            Code: {item.bookingCode}
                          </Chip>
                        )}
                      </div>

                      {/* Amenities */}
                      {'amenities' in item && item.amenities && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Amenities:</h4>
                          <div className="flex flex-wrap gap-1">
                            {item.amenities.map((amenity: any, amenityIndex: number) => (
                              <Chip key={amenityIndex} variant="bordered" size="sm" className="text-xs">
                                {amenity}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Details List */}
                      {'details' in item && item.details && (
                        <div className="mb-4">
                          <ul className="space-y-1">
                            {item.details.map((detail: any, detailIndex: number) => (
                              <li key={detailIndex} className="text-sm text-[#1E1E1E]/70 flex items-start gap-2">
                                <span className="text-[#C8A951] mt-1">•</span>
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
                              <li key={highlightIndex} className="text-sm text-[#1E1E1E]/70 flex items-start gap-2">
                                <span className="text-[#C8A951] mt-1">•</span>
                                {highlight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </Section>
          ))
        )}

        {/* Contact Section */}
        {data.contact && (
          <Section title={data.contact.title} subtitle={data.contact.description}>
            <Card className="border border-gray-200 shadow-md rounded-2xl text-center" radius="lg">
              <CardBody className="p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                    <Button
                      as="a"
                      href={`mailto:${data.contact.email}`}
                      variant="light"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      startContent={<Mail className="h-4 w-4" />}
                    >
                      {data.contact.email}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Section>
        )}
      </div>
    </MotionPage>
  )
}