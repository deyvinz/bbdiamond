'use client'

import { useEffect, useRef } from 'react'

interface RsvpConfettiProps {
  onComplete?: () => void
}

export function RsvpConfetti({ onComplete }: RsvpConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Confetti particles
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      color: string
      size: number
      life: number
      maxLife: number
    }> = []

    // Create confetti particles
    const createParticles = () => {
      const colors = ['#C7A049', '#D4AF37', '#F4E4BC', '#FFFFFF', '#F8F9FA']
      const particleCount = 150

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -10,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 3 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          life: 0,
          maxLife: Math.random() * 200 + 100
        })
      }
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i]
        
        // Update particle
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.1 // gravity
        particle.life++

        // Draw particle
        ctx.save()
        ctx.globalAlpha = 1 - (particle.life / particle.maxLife)
        ctx.fillStyle = particle.color
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size)
        ctx.restore()

        // Remove dead particles
        if (particle.life >= particle.maxLife || particle.y > canvas.height) {
          particles.splice(i, 1)
        }
      }

      // Continue animation if there are particles
      if (particles.length > 0) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete
        onComplete?.()
      }
    }

    // Start animation
    createParticles()
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [onComplete])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ background: 'transparent' }}
    />
  )
}
