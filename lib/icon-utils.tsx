import {
  Church,
  UtensilsCrossed,
  Heart,
  Calendar,
  MapPin,
  Users,
  Gift,
  Music,
  Camera,
  PartyPopper,
  Clock,
  Cake,
  Wine,
  Sparkles,
  Star,
  Building2,
  Circle,
  Cross,
  // Religious/Cultural icons - using available lucide-react icons
  // Note: Some specific religious icons may not exist, using symbolic alternatives
  Flower,
  Palmtree,
  TreePine,
  Waves,
  Sun,
  Moon,
  SunMoon,
  Compass,
} from 'lucide-react'
import { ComponentType } from 'react'
import type React from 'react'

// Type mapping for icon names to components
export const iconMap: Record<string, ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Church,
  UtensilsCrossed,
  Heart,
  Calendar,
  MapPin,
  Users,
  Gift,
  Music,
  Camera,
  PartyPopper,
  Clock,
  Cake,
  Wine,
  Sparkles,
  Star,
  Building2,
  Circle,
  Cross,
  Flower,
  Palmtree,
  TreePine,
  Waves,
  Sun,
  Moon,
  SunMoon,
  Compass,
}

/**
 * Dynamically renders a lucide-react icon by name
 * @param iconName - Name of the icon (must match a key in iconMap)
 * @param className - Optional className to apply to the icon
 * @param color - Optional color (CSS value) to apply via style
 * @returns The icon component or null if not found
 */
export function renderIcon(
  iconName: string | undefined | null,
  className?: string,
  color?: string
) {
  if (!iconName) return null

  const IconComponent = iconMap[iconName]
  if (!IconComponent) return null

  return <IconComponent className={className} style={color ? { color } : undefined} />
}

/**
 * Get all available icon names
 */
export function getAvailableIconNames(): string[] {
  return Object.keys(iconMap)
}

/**
 * Check if an icon name is valid
 */
export function isValidIconName(iconName: string): boolean {
  return iconName in iconMap
}

