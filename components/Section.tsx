export default function Section({
  title, subtitle, children, narrow=false
}: { title:string; subtitle?:string; children:React.ReactNode; narrow?:boolean }) {
  return (
    <section className="w-full py-12 md:py-20">
      <div className={`container mx-auto ${narrow ? 'max-w-3xl' : 'max-w-6xl'}`}>
        <div className="mb-8 md:mb-10 max-w-2xl">
          <h2 className="font-serif text-3xl md:text-4xl leading-tight foil">{title}</h2>
          {subtitle && <p className="mt-2 text-sm md:text-base text-black/70">{subtitle}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}
