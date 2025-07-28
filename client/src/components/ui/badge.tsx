// client/src/components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/25",
        secondary:
          "border-transparent bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground hover:shadow-lg hover:shadow-secondary/25",
        destructive:
          "border-transparent bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:shadow-lg hover:shadow-destructive/25",
        success:
          "border-transparent bg-gradient-to-r from-success to-success/90 text-success-foreground hover:shadow-lg hover:shadow-success/25",
        warning:
          "border-transparent bg-gradient-to-r from-warning to-warning/90 text-warning-foreground hover:shadow-lg hover:shadow-warning/25",
        outline:
          "text-foreground border-border hover:bg-accent hover:text-accent-foreground",
        glass:
          "glass bg-white/10 text-white border-white/20 hover:bg-white/20",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-2xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }