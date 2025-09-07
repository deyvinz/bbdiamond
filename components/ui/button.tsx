import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border border-gold-500 hover:bg-gold-50',
        gold: 'bg-gold-500 text-white hover:bg-gold-600 shadow-gold',
        outline: 'border border-gold-200 hover:bg-gold-50',
        ghost: 'hover:bg-gold-50',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        default: 'h-10 px-5 py-2',
        lg: 'h-12 px-6 text-base',
        sm: 'h-8 px-3'
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(
        buttonVariants({ variant, size, className }),
        "animate-in fade-in slide-in-from-bottom-1 duration-200"
      )} 
      {...props} 
    />
  )
}
