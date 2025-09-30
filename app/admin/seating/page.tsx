import { Suspense } from 'react'
import { CardSkeleton } from '@/components/CardSkeleton'
import SeatingClient from './SeatingClient'

export default function AdminSeatingPage() {
  return (
    <Suspense fallback={
      <div className="grid gap-4 py-8">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    }>
      <SeatingClient />
    </Suspense>
  )
}
