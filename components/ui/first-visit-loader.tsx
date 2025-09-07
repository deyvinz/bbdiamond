"use client"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function PageLoader() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Show loader on every page load/refresh
    setShow(true)
    
    // Hide after a short delay to allow page to load
    const timer = setTimeout(() => {
      setShow(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
        <div className="rounded-full p-4 shadow-[0_0_40px_0_rgba(212,175,55,0.35)]">
          <Image
            src="/images/logo.png"
            alt="Brenda & Diamond"
            width={120}
            height={120}
            className="h-28 w-28 object-contain animate-pulse"
            priority
          />
        </div>
        <p className="text-sm tracking-wide text-black/60">#BrendaBagsHerDiamond</p>
      </div>
    </div>
  )
}


