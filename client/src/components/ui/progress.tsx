"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const progressVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      size: {
        default: "h-3",
        sm: "h-2",
        lg: "h-4",
        xl: "h-6",
      },
      variant: {
        default: "bg-secondary",
        glass: "glass bg-white/10 border border-white/20",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

const indicatorVariants = cva(
  "h-full w-full flex-1 transition-all duration-500 ease-out",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-primary/90",
        success: "bg-gradient-to-r from-success to-success/90",
        warning: "bg-gradient-to-r from-warning to-warning/90",
        destructive: "bg-gradient-to-r from-destructive to-destructive/90",
        glass: "bg-gradient-to-r from-white/80 to-white/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  indicatorVariant?: VariantProps<typeof indicatorVariants>["variant"]
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size, variant, indicatorVariant, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(progressVariants({ size, variant }), className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(indicatorVariants({ variant: indicatorVariant || variant }))}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
