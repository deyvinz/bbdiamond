'use client'
import { supabase } from '@/lib/supabase-browser'

export default function SignOutButton() {
  const onClick = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }
  return (
    <button onClick={onClick} className="text-sm underline underline-offset-4 hover:text-gold-700">
      Sign out
    </button>
  )
}
