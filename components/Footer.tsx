export default function Footer(){
    return (
      <footer className="border-t border-gold-100/60 bg-white/70 backdrop-blur py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto max-w-6xl px-4 md:px-6 text-center text-sm text-black/70">
          Made with love by <a 
            href="https://www.glumia.com" 
            className="text-gold-500 hover:text-gold-600 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Glumia
          </a> • © {new Date().getFullYear()}
        </div>
      </footer>
    )
  }
  