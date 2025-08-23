import Section from '@/components/Section'
import Card from '@/components/Card'

export default function Page(){
  return (
    <Section title="Travel" subtitle="Airports, hotels & tips">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card><h3 className="font-medium">Airports</h3><p className="text-sm text-black/70">CDG (best), ORY (alt)</p></Card>
        <Card><h3 className="font-medium">Hotels</h3><p className="text-sm text-black/70">Ritz, Le Meurice, Relais Christine</p></Card>
        <Card><h3 className="font-medium">Transport</h3><p className="text-sm text-black/70">Rideshare & Metro (Line 1)</p></Card>
      </div>
    </Section>
  )
}
