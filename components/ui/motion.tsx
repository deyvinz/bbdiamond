"use client"

import { cn } from "@/lib/utils"

// Page transition wrapper
export function MotionPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      {children}
    </div>
  )
}

// Staggered children animation
export function MotionStagger({ 
  children, 
  className
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("animate-in fade-in duration-300", className)}>
      {children}
    </div>
  )
}

// Staggered item
export function MotionItem({ 
  children, 
  className,
  delay = "delay-75"
}: { 
  children: React.ReactNode
  className?: string
  delay?: string
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 duration-200",
        delay,
        className
      )}
    >
      {children}
    </div>
  )
}

// Button hover animation
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
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      {children}
    </button>
  )
}

// Card hover animation
export function MotionCard({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div
      className={cn(
        "transition-all duration-150 hover:-translate-y-1 hover:scale-105 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      {children}
    </div>
  )
}
