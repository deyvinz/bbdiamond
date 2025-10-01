import Section from '@/components/Section'
import { supabaseServer } from "@/lib/supabase-server";
import Image from 'next/image';
import { Card } from '@/components/Card';

export default async function Page(){
  const supabase = await supabaseServer()
  const { data, error } = await supabase
    .from('gallery_images')
    .select('url, caption, sort_order')
    .order('sort_order', { ascending: true })

  // If there's an error or no data, show a message
  if (error) {
    console.error('Error fetching gallery images:', error)
  }

  const imgs: { url: string; caption: string; sort_order?: number }[] = data ?? []

  return (
    <Section title="Gallery" subtitle="Moments we love">
      {imgs.length === 0 ? (
        <Card className="text-center p-12">
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-xl font-semibold text-gold-800 mb-2">Gallery Coming Soon</h3>
          <p className="text-gold-600">
            We're preparing beautiful moments to share with you. Check back soon!
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          {imgs.map((img, index) => (
            <Card key={img.url || index} className="p-0 overflow-hidden group hover:scale-105 transition-transform duration-200">
              <div className="aspect-square relative">
                <Image
                  src={img.url}
                  alt={img.caption || `Gallery image ${index + 1}`}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {img.caption && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200 flex items-end">
                    <p className="text-white p-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {img.caption}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  )
}
