import Section from '@/components/Section'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardBody } from '@heroui/react'
import { MotionStagger, MotionItem } from '@/components/ui/motion'
import { supabaseServer } from '@/lib/supabase-server'
import { getWeddingId } from '@/lib/wedding-context-server'

export default async function Page(){
  const weddingId = await getWeddingId()
  
  if (!weddingId) {
    return (
      <Section title="Wedding Party" subtitle="Our Wedding Team">
        <Card className="text-center border border-gray-200 shadow-lg rounded-3xl" radius="lg">
          <CardBody className="p-12">
            <h3 className="text-xl font-semibold text-[#C8A951] mb-2">Wedding Party Unavailable</h3>
            <p className="text-[#1E1E1E]/70">
              Wedding context is required to view the wedding party.
            </p>
          </CardBody>
        </Card>
      </Section>
    )
  }

  const supabase = await supabaseServer()
  const { data: members, error } = await supabase
    .from('wedding_party')
    .select('name, role, image_url, bio')
    .eq('wedding_id', weddingId)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching wedding party:', error)
  }

  const partyMembers = members || []
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (partyMembers.length === 0) {
    return (
      <Section title="Wedding Party" subtitle="Our Wedding Team">
        <Card className="text-center border border-gray-200 shadow-lg rounded-3xl" radius="lg">
          <CardBody className="p-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-[#C8A951] mb-2">Wedding Party Coming Soon</h3>
            <p className="text-[#1E1E1E]/70">
              We're preparing to introduce our wedding party members. Check back soon!
            </p>
          </CardBody>
        </Card>
      </Section>
    )
  }

  return (
    <Section title="Wedding Party" subtitle="Our Wedding Team">
      <MotionStagger className="grid xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {partyMembers.map((member: { name: string; role: string; image_url?: string | null; bio?: string | null }, index: number) => (
          <MotionItem key={index}>
            <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 rounded-2xl group" radius="lg">
              <CardBody className="p-6 flex flex-col items-center text-center">
                <div className="mb-4 transition-all duration-200 group-hover:scale-105">
                  {member.image_url && member.image_url.trim() !== '' ? (
                    <div className="relative h-40 w-40 rounded-full overflow-hidden border-2 border-gold-200 shadow-gold mx-auto">
                      <img
                        src={member.image_url}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <Avatar className="h-40 w-40">
                      <AvatarFallback className="text-2xl font-semibold bg-[#C8A951]/10 text-[#C8A951]">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-lg text-[#1E1E1E] group-hover:text-[#C8A951] transition-colors duration-200">
                    {member.name}
                  </h3>
                  <p className="text-sm text-[#1E1E1E]/70 group-hover:text-[#C8A951] transition-colors duration-200">
                    {member.role}
                  </p>
                  {member.bio && (
                    <p className="text-xs text-[#1E1E1E]/60 mt-2">
                      {member.bio}
                    </p>
                  )}
                </div>
              </CardBody>
            </Card>
          </MotionItem>
        ))}
      </MotionStagger>
    </Section>
  )
}
