import { Suspense } from 'react'
import { CardSkeleton } from '@/components/CardSkeleton'
import SeatingChartClient from './SeatingChartClient'

export default function SeatingChartPage() {
  return (
    <Suspense fallback={
      <div className="grid gap-4 py-8">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    }>
      <SeatingChartClient />
    </Suspense>
  )
}
