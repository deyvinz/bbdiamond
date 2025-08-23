export default function Footer(){
    return (
      <footer className="border-t border-gold-100/60 bg-white/70 backdrop-blur py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-6 text-center text-sm text-black/70">
          Made with love by <a href="https://www.glumia.ng" className="text-gold-500 hover:text-gold-600 transition-colors">Glumia</a> • © {new Date().getFullYear()}
        </div>
      </footer>
    )
  }
  