'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Accordion({ items }:{ items:{q:string;a:string}[] }){
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="divide-y divide-gold-100">
      {items.map((it,idx)=>(
        <button key={idx} className="w-full text-left py-4"
          onClick={()=>setOpen(open===idx?null:idx)} aria-expanded={open===idx}>
          <div className="flex items-center justify-between">
            <span className="font-medium">{it.q}</span>
            <ChevronDown className={`transition ${open===idx?'rotate-180':''}`} />
          </div>
          {open===idx && <p className="mt-2 text-sm text-black/70">{it.a}</p>}
        </button>
      ))}
    </div>
  )
}
