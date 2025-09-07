import Section from '@/components/Section'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { MotionStagger, MotionItem } from '@/components/ui/motion'
import weddingParty from './wedding-party.json'

export default function Page(){
  const members = weddingParty
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Section title="Wedding Party" subtitle="Our favorite people">
      <MotionStagger className="grid xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {members.map((member, index) => (
          <MotionItem key={index} className="flex flex-col items-center text-center group">
            <div className="mb-4 transition-all duration-200 group-hover:scale-105">
              <Avatar className="h-40 w-40">
                {member.image && member.image.trim() !== '' ? (
                  <AvatarImage
                    src={member.image}
                    alt={member.name}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="text-2xl font-semibold">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-lg group-hover:text-gold-700 transition-colors duration-200">
                {member.name}
              </h3>
              <p className="text-sm text-black/70 group-hover:text-gold-600 transition-colors duration-200">
                {member.role}
              </p>
            </div>
          </MotionItem>
        ))}
      </MotionStagger>
    </Section>
  )
}
