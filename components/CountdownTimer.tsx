'use client'
import { useState, useEffect } from 'react'
import { Card } from '@/components/Card'
import { MotionItem } from '@/components/ui/motion'

interface CountdownTimerProps {
  targetDate: string // ISO date string
  title?: string
  subtitle?: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function CountdownTimer({ 
  targetDate, 
  title = "Countdown to Our Wedding",
  subtitle = "The big day is approaching!"
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const target = new Date(targetDate).getTime()
      const difference = target - now

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24))
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)

        setTimeLeft({ days, hours, minutes, seconds })
        setIsExpired(false)
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        setIsExpired(true)
      }
    }

    // Calculate immediately
    calculateTimeLeft()

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-gradient-to-br from-gold-100 to-gold-200 border border-gold-300 rounded-xl p-4 md:p-6 min-w-[80px] md:min-w-[100px] text-center shadow-gold">
        <div className="text-2xl md:text-4xl font-bold text-gold-800 mb-1">
          {value.toString().padStart(2, '0')}
        </div>
        <div className="text-xs md:text-sm font-medium text-gold-700 uppercase tracking-wide">
          {label}
        </div>
      </div>
    </div>
  )

  if (isExpired) {
    return (
      <MotionItem className="w-full max-w-4xl mx-auto">
        <Card className="text-center p-8 md:p-12">
          <div className="text-6xl md:text-8xl mb-4">🎉</div>
          <h2 className="text-2xl md:text-3xl font-bold text-gold-800 mb-2">
            It's Our Wedding Day!
          </h2>
          <p className="text-lg text-gold-600">
            The moment we've been waiting for has arrived!
          </p>
        </Card>
      </MotionItem>
    )
  }

  return (
    <MotionItem className="w-full max-w-4xl mx-auto">
      <Card className="text-center p-8 md:p-12">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gold-800 mb-2">
            {title}
          </h2>
          <p className="text-lg text-gold-600">
            {subtitle}
          </p>
        </div>
        
        <div className="flex justify-center items-center gap-4 md:gap-6 flex-wrap">
          <TimeUnit value={timeLeft.days} label="Days" />
          <div className="text-2xl md:text-3xl text-gold-600 font-bold">:</div>
          <TimeUnit value={timeLeft.hours} label="Hours" />
          <div className="text-2xl md:text-3xl text-gold-600 font-bold">:</div>
          <TimeUnit value={timeLeft.minutes} label="Minutes" />
          <div className="text-2xl md:text-3xl text-gold-600 font-bold">:</div>
          <TimeUnit value={timeLeft.seconds} label="Seconds" />
        </div>
        
        <div className="mt-6 text-sm text-gold-500">
          Until {new Date(targetDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </Card>
    </MotionItem>
  )
}
