import { redirect } from 'next/navigation'
import { getWeddingContext } from '@/lib/wedding-context-server'
import HomepageCTAsClient from './HomepageCTAsClient'
import { getAllHomepageCTAs } from '@/lib/homepage-ctas-service'

export default async function HomepageCTAsPage() {
  const context = await getWeddingContext()
  
  if (!context) {
    redirect('/admin')
  }

  const ctas = await getAllHomepageCTAs(context.weddingId)

  return <HomepageCTAsClient initialCTAs={ctas} />
}

