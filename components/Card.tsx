export default function Card({children,className='' }:{children:React.ReactNode; className?:string}){
  return (
    <div className={`rounded-2xl border border-gold-100 bg-white/90 shadow-gold p-6 md:p-8 ${className}`}>
      {children}
    </div>
  )
}
