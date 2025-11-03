"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import { Spinner } from "@heroui/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function PageLoader() {
  const [show, setShow] = useState(true)
  const [weddingInfo, setWeddingInfo] = useState<{ 
    couple_display_name?: string
    bride_name?: string
    groom_name?: string
    hashtag?: string
    logo_url?: string | null
  } | null>(null)
  const [isStorePage, setIsStorePage] = useState(false)

  useEffect(() => {
    // Show loader on every page load/refresh
    setShow(true)
    
    // Check if we're on a store page
    const pathname = window.location.pathname
    setIsStorePage(pathname.startsWith('/store') || pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding') || pathname.startsWith('/auth'))
    
    // Hide after a short delay to allow page to load
    const timer = setTimeout(() => {
      setShow(false)
    }, 1500)

    // Fetch wedding info
    const fetchWeddingInfo = async () => {
      try {
        const response = await fetch('/api/wedding-info')
        const data = await response.json()
        if (data.success && data.wedding) {
          setWeddingInfo(data.wedding)
        }
      } catch (error) {
        console.error('Error fetching wedding info:', error)
      }
    }
    
    // Only fetch wedding info if not on store page
    if (!isStorePage) {
      fetchWeddingInfo()
    }

    return () => clearTimeout(timer)
  }, [isStorePage])

  if (!show) return null

  const displayName = weddingInfo?.couple_display_name || 'Wedding'
  const hashtag = weddingInfo?.hashtag || null

  // Get initials from bride and groom names
  const getInitials = () => {
    const bride = weddingInfo?.bride_name || ''
    const groom = weddingInfo?.groom_name || ''
    const brideInitial = bride.charAt(0).toUpperCase()
    const groomInitial = groom.charAt(0).toUpperCase()
    return `${brideInitial}${groomInitial}` || 'W'
  }

  // Store pages: Show brand logo
  if (isStorePage) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <div className="rounded-full p-4 shadow-[0_0_40px_0_rgba(212,175,55,0.35)]">
            <Image
              src="/images/logo.png"
              alt="Luwāni"
              width={120}
              height={120}
              className="h-28 w-28 object-contain animate-pulse"
              priority
            />
          </div>
        </div>
      </div>
    )
  }

  // Wedding pages: Show wave spinner, or avatar with initials if logo exists
  const hasLogo = weddingInfo?.logo_url && weddingInfo.logo_url !== '/images/logo.png'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-white to-gray-50/50">
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-300">
        {hasLogo ? (
          // Show avatar with initials when logo exists
          <div className="rounded-full p-4 shadow-[0_0_40px_0_rgba(212,175,55,0.35)]">
            <Avatar className="h-28 w-28">
              <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-[#C8A951]/20 to-[#B38D39]/20 text-[#C8A951] border-2 border-[#C8A951]/30">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          // Show HeroUI Wave Spinner when no logo
          <div className="flex flex-col items-center gap-4">
            <Spinner 
              size="lg"
              color="primary"
              variant="wave"
              classNames={{
                dots: "[&>div]:bg-[#C8A951]",
              }}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-[#1E1E1E]/70">Loading...</p>
            </div>
          </div>
        )}
        {hashtag && (
          <p className="text-sm tracking-wide text-black/60 mt-2">{hashtag}</p>
        )}
      </div>
    </div>
  )
}


