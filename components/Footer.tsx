import { getWeddingContext } from '@/lib/wedding-context-server'
import { FooterClient } from '@/components/FooterClient'

export default async function Footer() {
  const context = await getWeddingContext()
  const currentYear = new Date().getFullYear()

  // Optionally show wedding name in footer
  const coupleName = context?.wedding?.couple_display_name

  return <FooterClient coupleName={coupleName} currentYear={currentYear} />
}
