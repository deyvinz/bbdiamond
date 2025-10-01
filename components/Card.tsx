export default function Card({children,className='' }:{children:React.ReactNode; className?:string}){
  return (
    <div 
      className={`rounded-2xl border border-gold-100 bg-white/90 shadow-gold p-6 md:p-8 transition-all duration-150 hover:-translate-y-1 hover:scale-105 hover:shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 ${className}`}
    >
      {children}
    </div>
  )
}

export { Card }