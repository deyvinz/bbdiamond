import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container max-w-6xl px-4 md:px-6 py-12 md:py-20">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 md:gap-12">
        {/* Hero Section Skeleton */}
        <div className="text-center flex flex-col items-center justify-center w-full max-w-2xl">
          {/* "You're invited" text skeleton */}
          <Skeleton className="h-4 w-32 mb-8 rounded-full" />
          
          {/* Elegant logo/Image skeleton with gold accents */}
          <div className="relative mb-8">
            <Skeleton className="h-48 w-48 sm:h-64 sm:w-64 md:h-80 md:w-80 rounded-2xl border-2 border-gold-200/30 shadow-lg" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold-100/30 via-transparent to-gold-50/20" />
          </div>
          
          {/* Date and location skeleton */}
          <Skeleton className="h-5 w-64 mb-10 rounded-lg" />
          
          {/* Elegant button skeletons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center w-full sm:w-auto">
            <div className="relative">
              <Skeleton className="h-12 w-full sm:w-36 rounded-2xl shadow-md" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gold-100/20 to-transparent opacity-50" />
            </div>
            <div className="relative">
              <Skeleton className="h-12 w-full sm:w-36 rounded-2xl border-2 border-gold-200/30 shadow-sm" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-gold-50/10 to-transparent opacity-50" />
            </div>
            <div className="relative">
              <Skeleton className="h-12 w-full sm:w-36 rounded-2xl border-2 border-gold-200/30 shadow-sm" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-gold-50/10 to-transparent opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Countdown Timer Skeleton */}
      <div className="py-12 md:py-16">
        <div className="text-center mb-10">
          <Skeleton className="h-8 w-80 mx-auto mb-4 rounded-lg" />
          <Skeleton className="h-5 w-64 mx-auto rounded-lg" />
        </div>
        <div className="flex justify-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative">
              <Skeleton className="h-24 w-24 rounded-xl border border-gold-200/30 shadow-md" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gold-100/20 to-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Event Details Skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="relative">
            <Skeleton className="h-64 rounded-2xl border border-gold-200/30 shadow-md" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold-50/20 via-transparent to-transparent" />
          </div>
          <div className="relative">
            <Skeleton className="h-64 rounded-2xl border border-gold-200/30 shadow-md" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold-50/20 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}

