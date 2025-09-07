'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-browser'
import { useSearchParams } from 'next/navigation'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const hashParam = searchParams.get('hash')
    
    if (errorParam) {
      let errorMessage = decodeURIComponent(errorParam)
      
      // Convert technical error codes to user-friendly messages
      switch (errorParam) {
        case 'no_auth_params':
          errorMessage = 'No authentication parameters found in the link'
          break
        case 'magic_link_no_code':
          errorMessage = 'Magic link format not recognized'
          break
        case 'no_session':
          errorMessage = 'Failed to create session. Please try again'
          break
        case 'callback_error':
          errorMessage = 'Authentication callback error. Please try again'
          break
      }
      
      setError(errorMessage)
    }

    // Handle hash-based authentication (newer Supabase format)
    if (hashParam) {
      handleHashAuthentication(hashParam)
    }
  }, [searchParams])

  const handleHashAuthentication = async (hash: string) => {
    try {
      setError(null)
      setStatus('Processing authentication...')
      
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (accessToken && refreshToken && type === 'magiclink') {
        // Set the session using the tokens
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (error) {
          setError(error.message)
          return
        }

        if (data.session) {
          setStatus('Authentication successful!')
          // Clear the URL parameters
          window.history.replaceState({}, document.title, window.location.pathname)
          // Redirect to admin page
          setTimeout(() => {
            window.location.href = '/admin'
          }, 2000)
        } else {
          setError('No session created')
        }
      } else {
        setError('Invalid authentication parameters')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Do not include emailRedirectTo so user receives OTP code (no magic link flow)
        shouldCreateUser: false,
      }
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus('Verifying code...')
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    if (error) {
      setStatus(null)
      setError(error.message)
      return
    }
    if (data?.session) {
      setStatus('Authentication successful!')
      // Hard redirect so server reads cookies
      window.location.href = '/admin'
    } else {
      setStatus(null)
      setError('Invalid or expired code')
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="fixed inset-0 -z-10 bg-subtleGrid bg-[length:16px_16px]" />
      <section className="container max-w-md py-16 px-4">
        <div className="bg-white/80 backdrop-blur border border-gold-100 rounded-2xl p-8 shadow-gold">
          <h1 className="font-serif text-3xl mb-2 text-center">Admin Sign-in</h1>
          <p className="text-sm text-black/60 text-center mb-6">Brenda & Diamond Wedding</p>
          {status ? (
            <div className="text-center">
              <p className="text-gold-700 font-medium">{status}</p>
              {status.includes('successful') && (
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold-600 mx-auto"></div>
                </div>
              )}
            </div>
          ) : sent ? (
            <form onSubmit={onVerifyCode} className="space-y-4">
              <p className="text-sm text-black/70 text-center">Enter the 6-digit code sent to {email}.</p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder="Enter code"
                value={code}
                onChange={e=>setCode(e.target.value)}
                className="w-full border border-gold-200 px-4 py-3 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-colors tracking-widest text-center"
              />
              <button className="w-full px-5 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-medium">
                Verify code
              </button>
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            </form>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <input
                type="email" 
                required 
                placeholder="you@yourdomain.com"
                value={email} 
                onChange={e=>setEmail(e.target.value)}
                className="w-full border border-gold-200 px-4 py-3 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-colors"
              />
              <button className="w-full px-5 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-medium">
                Send code
              </button>
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
