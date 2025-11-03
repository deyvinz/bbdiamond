"use client"

import * as React from "react"
import { Avatar as HeroUIAvatar } from "@heroui/react"
import { cn } from "@/lib/utils"

// Forward declare components with display names for type checking
const AVATAR_IMAGE_DISPLAY_NAME = "AvatarImage"
const AVATAR_FALLBACK_DISPLAY_NAME = "AvatarFallback"

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string
  alt?: string
  className?: string
}

function AvatarImage({ className, ...props }: AvatarImageProps) {
  // This component is handled by Avatar's children processing
  // Return null as HeroUI Avatar handles the image internally
  return null
}
AvatarImage.displayName = AVATAR_IMAGE_DISPLAY_NAME

interface AvatarFallbackProps {
  className?: string
  children?: React.ReactNode
}

function AvatarFallback({ className, children }: AvatarFallbackProps) {
  // This component is handled by Avatar's children processing
  // Return null as HeroUI Avatar handles the fallback internally
  return null
}
AvatarFallback.displayName = AVATAR_FALLBACK_DISPLAY_NAME

interface AvatarProps extends Omit<React.ComponentProps<typeof HeroUIAvatar>, 'src' | 'name'> {
  className?: string
  children?: React.ReactNode
}

function Avatar({ className, children, ...props }: AvatarProps) {
  const avatarState: {
    src?: string
    alt?: string
    fallback?: React.ReactNode
    fallbackClassName?: string
    name?: string
  } = {
    src: undefined,
    alt: undefined,
    fallback: undefined,
    fallbackClassName: undefined,
    name: undefined,
  }

  // Extract src, alt, fallback, and name from children
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      // Use displayName for reliable component type checking
      const displayName = (child.type as any)?.displayName
      if (displayName === AVATAR_IMAGE_DISPLAY_NAME) {
        const childProps = child.props as AvatarImageProps
        avatarState.src = childProps.src
        avatarState.alt = childProps.alt
      } else if (displayName === AVATAR_FALLBACK_DISPLAY_NAME) {
        const childProps = child.props as AvatarFallbackProps
        avatarState.fallback = childProps.children
        avatarState.fallbackClassName = childProps.className
      }
    }
  })

  // Extract name from fallback text if it's a string (for initials generation)
  // This helps HeroUI generate initials when no custom fallback is provided
  const extractNameFromFallback = (): string | undefined => {
    if (typeof avatarState.fallback === 'string') {
      return avatarState.fallback
    }
    // If fallback is a React element with children, try to extract text
    if (React.isValidElement(avatarState.fallback)) {
      const fallbackProps = avatarState.fallback.props as { children?: React.ReactNode }
      const text = fallbackProps?.children
      if (typeof text === 'string') {
        return text
      }
    }
    return undefined
  }

  // Calculate size from className (e.g., "h-40 w-40" -> "lg")
  const getSizeFromClassName = (): "sm" | "md" | "lg" | undefined => {
    if (className?.includes('h-40') || className?.includes('w-40')) return 'lg'
    if (className?.includes('h-28') || className?.includes('w-28')) return 'lg'
    if (className?.includes('h-24') || className?.includes('w-24')) return 'md'
    if (className?.includes('h-12') || className?.includes('w-12')) return 'md'
    if (className?.includes('h-10') || className?.includes('w-10')) return 'sm'
    return undefined
  }

  // Extract name for HeroUI's built-in initials generation
  // Use name from fallback text or alt as fallback for automatic initials
  const nameForInitials = extractNameFromFallback() || avatarState.alt

  // HeroUI's fallback prop expects a ReactNode
  // If custom fallback is provided, use it; otherwise HeroUI will use name for initials
  const fallbackContent = avatarState.fallback || undefined

  return (
    <HeroUIAvatar
      src={avatarState.src}
      name={nameForInitials}
      fallback={fallbackContent}
      size={getSizeFromClassName() || props.size || "lg"}
      radius="full"
      isBordered
      className={cn(
        "border-2 border-gold-200 shadow-gold",
        className
      )}
      classNames={{
        base: cn("border-2 border-gold-200 shadow-gold", className),
        img: "object-cover",
        fallback: cn(
          "bg-gold-100 text-gold-700 flex size-full items-center justify-center rounded-full font-medium",
          avatarState.fallbackClassName
        ),
      }}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
