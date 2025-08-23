'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function Checkin() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [msg,setMsg] = useState('')

  useEffect(() => {
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'environment' }})
      if (videoRef.current) videoRef.current.srcObject = stream
      // For brevity: use any small QR lib that reads from canvas frames
      // or import 'html5-qrcode' package for quick integration.
    })()
  }, [])

  const onDecode = async (token: string) => {
    const { data, error } = await supabase.rpc('check_in_by_token', { p_token: token })
    setMsg(error ? error.message : 'Checked in ✓')
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-serif mb-4">Check‑In</h1>
      <video ref={videoRef} autoPlay playsInline className="w-full max-w-md border border-gold-100" />
      <p className="mt-3">{msg}</p>
    </div>
  )
}
