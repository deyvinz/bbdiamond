import Section from '@/components/Section'
import { supabaseServer } from "@/lib/supabase-server";
import Image from 'next/image';
import { Card, CardBody } from '@heroui/react';
import { getWeddingId } from '@/lib/wedding-context-server';

export default async function Page(){
  const weddingId = await getWeddingId()
  
  if (!weddingId) {
    return (
      <Section title="Gallery" subtitle="Moments we love">
        <Card className="text-center border border-gray-200 shadow-lg rounded-3xl" radius="lg">
          <CardBody className="p-12">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-[#C8A951] mb-2">Gallery Unavailable</h3>
            <p className="text-[#1E1E1E]/70">
              Wedding context is required to view the gallery.
            </p>
          </CardBody>
        </Card>
      </Section>
    )
  }

  const supabase = await supabaseServer()
  const { data, error } = await supabase
    .from('gallery_images')
    .select('image_url, caption, display_order')
    .eq('wedding_id', weddingId)
    .order('display_order', { ascending: true })

  // If there's an error or no data, show a message
  if (error) {
    console.error('Error fetching gallery images:', error.message || error)
  }

  const imgs: { image_url: string; caption: string; display_order?: number }[] = data ?? []

  return (
    <Section title="Gallery" subtitle="Moments we love">
      {imgs.length === 0 ? (
        <Card className="text-center border border-gray-200 shadow-lg rounded-3xl" radius="lg">
          <CardBody className="p-12">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-[#C8A951] mb-2">Gallery Coming Soon</h3>
            <p className="text-[#1E1E1E]/70">
              We're preparing beautiful moments to share with you. Check back soon!
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          {imgs.map((img, index) => (
            <Card key={img.image_url || index} className="p-0 overflow-hidden group hover:scale-105 transition-transform duration-200 border border-gray-200 shadow-md rounded-2xl" radius="lg">
              <CardBody className="p-0">
                <div className="aspect-square relative">
                  <Image
                    src={img.image_url}
                    alt={img.caption || `Gallery image ${index + 1}`}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300 rounded-2xl"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  {img.caption && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200 flex items-end rounded-2xl">
                      <p className="text-white p-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {img.caption}
                      </p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </Section>
  )
}
