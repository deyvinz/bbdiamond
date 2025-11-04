"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function Skeleton({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg",
        "bg-gradient-to-r from-gold-50 via-gold-100/40 to-gold-50",
        "animate-pulse",
        className
      )}
      {...props}
    >
      {/* Elegant shimmer overlay */}
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer-slide_2s_ease-in-out_infinite]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent)",
        }}
      />
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="border border-gold-200/50 rounded-2xl p-6 bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full border-2 border-gold-200/30" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
      </div>
      <div className="mt-6 space-y-2.5">
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-5/6 rounded-lg" />
        <Skeleton className="h-4 w-4/6 rounded-lg" />
      </div>
    </div>
  )
}


