import Section from '@/components/Section'
export default function Page(){
  const members = Array.from({length:8}).map((_,i)=>({name:`Member ${i+1}`, role:i%2?'Groomsman':'Bridesmaid'}))
  return (
    <Section title="Wedding Party" subtitle="Our favorite people">
      <div className="grid xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {members.map((m,i)=>(
          <div key={i} className="text-center">
            <div className="mx-auto h-40 w-40 rounded-full border border-gold-100" />
            <h3 className="mt-3 font-medium">{m.name}</h3>
            <p className="text-sm text-black/70">{m.role}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
