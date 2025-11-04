import { ThemeProvider } from './ThemeProvider'
import { getWeddingTheme, getDefaultTheme } from '@/lib/theme-service'

/**
 * Server component wrapper that fetches theme and provides it
 */
export async function ThemeProviderServer({
  weddingId,
  children,
}: {
  weddingId: string
  children: React.ReactNode
}) {
  const theme = await getWeddingTheme(weddingId) || getDefaultTheme()

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

