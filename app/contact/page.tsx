export default function Page(){
    return (
      <section className="container py-12 md:py-20">
        <h1 className="text-4xl md:text-5xl font-serif foil mb-3">Contact Us</h1>
        <p className="text-black/70 mb-6">Questions? Send us a note below.</p>
        <div className="rounded-xl border border-gold-100 overflow-hidden">
          <iframe
            className="w-full h-[1200px]"
            src="https://forms.gle/rP9UnFrMNPriUEZp8"
          />
        </div>
      </section>
    )
  }
  