"use client"

import { cn } from "@/lib/utils"
import { motion, useInView, Variants } from "framer-motion"
import { useRef } from "react"

// Animation variants
const fadeInUp: Variants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.21, 1.11, 0.81, 0.99] // Elegant easing curve
    }
  }
}

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: [0.21, 1.11, 0.81, 0.99]
    }
  }
}

const scaleIn: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.21, 1.11, 0.81, 0.99]
    }
  }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

// Page transition wrapper with elegant fade-in
export function MotionPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className={cn("w-full", className)}
    >
      {children}
    </motion.div>
  )
}

// Staggered container for children
export function MotionStagger({ 
  children, 
  className,
  delay = 0.2
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: staggerContainer.hidden,
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: delay
          }
        }
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

// Staggered item with scroll-trigger
export function MotionItem({ 
  children, 
  className,
  delay = 0,
  index = 0
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
  index?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once: true, 
    margin: "-100px",
    amount: 0.3
  })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      transition={{
        duration: 0.6,
        delay: delay + (index * 0.1),
        ease: [0.21, 1.11, 0.81, 0.99]
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

// Scroll-triggered fade-in component
export function MotionFadeIn({ 
  children, 
  className,
  delay = 0,
  direction = "up"
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: "up" | "down" | "left" | "right"
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once: true, 
    margin: "-50px",
    amount: 0.3
  })

  const directionVariants = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 }
  }

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0, 
        ...directionVariants[direction] 
      }}
      animate={isInView ? { 
        opacity: 1, 
        x: 0, 
        y: 0 
      } : { 
        opacity: 0, 
        ...directionVariants[direction] 
      }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.21, 1.11, 0.81, 0.99]
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

// Card with elegant hover animation
export function MotionCard({ 
  children, 
  className,
  delay = 0,
  index = 0
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
  index?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once: true, 
    margin: "-50px",
    amount: 0.2
  })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      transition={{
        duration: 0.6,
        delay: delay + (index * 0.1),
        ease: [0.21, 1.11, 0.81, 0.99]
      }}
      whileHover={{ 
        y: -8,
        scale: 1.02,
        transition: { 
          duration: 0.3,
          ease: [0.21, 1.11, 0.81, 0.99]
        }
      }}
      className={cn(
        "transition-shadow duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  )
}

// Button with smooth interactions
export function MotionButton({ 
  children, 
  className,
  onClick,
  disabled = false,
  type = "button"
}: { 
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      whileHover={{ 
        scale: 1.05,
        transition: { duration: 0.2 }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {children}
    </motion.button>
  )
}

// Parallax wrapper (subtle effect)
export function MotionParallax({ 
  children, 
  className,
  speed = 0.5
}: { 
  children: React.ReactNode
  className?: string
  speed?: number
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={fadeIn}
      style={{
        willChange: "transform"
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

// Text reveal animation
export function MotionText({ 
  children, 
  className,
  delay = 0
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.21, 1.11, 0.81, 0.99]
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

// Section with elegant entrance
export function MotionSection({ 
  children, 
  className,
  delay = 0,
  id,
  ...restProps
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
  id?: string
} & Omit<React.HTMLAttributes<HTMLElement>, 'onDrag' | 'onDragEnd' | 'onDragStart'>) {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once: false, 
    margin: "0px",
    amount: 0
  })

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.21, 1.11, 0.81, 0.99]
      }}
      className={cn(className)}
      id={id}
      {...(restProps as any)}
    >
      {children}
    </motion.section>
  )
}
