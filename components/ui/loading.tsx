"use client"

import { cn } from "@/lib/utils"

interface LoadingProps {
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "gold"
}

export function Loading({ className, size = "md", variant = "default" }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  const variantClasses = {
    default: "border-gray-300 border-t-gray-600",
    gold: "border-gold-200 border-t-gold-500"
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2",
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
    </div>
  )
}

export function LoadingPage({ className }: { className?: string }) {
  return (
    <div className={cn("min-h-[50vh] flex items-center justify-center", className)}>
      <div className="text-center">
        <Loading size="lg" variant="gold" className="mx-auto mb-4" />
      </div>
    </div>
  )
}

export function LoadingButton({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Loading size="sm" variant="gold" />
    </div>
  )
}
