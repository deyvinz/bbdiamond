import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Base checkbox styles - explicitly reset any inherited styles
      "peer inline-flex items-center justify-center shrink-0",
      "h-4 w-4 rounded-sm border-2 border-gray-400",
      "bg-white text-gray-900",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-gold-600 data-[state=checked]:border-gold-600 data-[state=checked]:text-white",
      // Explicitly prevent button-like styles
      "appearance-none p-0 m-0",
      "font-inherit",
      "cursor-pointer",
      "transition-colors",
      "hover:border-gray-500",
      "data-[state=checked]:hover:bg-gold-700 data-[state=checked]:hover:border-gold-700",
      // Remove any button-specific transitions or transforms
      "[&:not(:disabled)]:cursor-pointer",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-white pointer-events-none")}
    >
      <Check className="h-4 w-4 stroke-[3]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
