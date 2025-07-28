import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 interactive touch-target",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg hover:shadow-primary/25",
        destructive: "bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:from-destructive/90 hover:to-destructive shadow-md hover:shadow-lg hover:shadow-destructive/25",
        outline: "border-2 border-input bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-accent",
        secondary: "bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground hover:from-secondary/90 hover:to-secondary shadow-md hover:shadow-lg hover:shadow-secondary/25",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-gradient-to-r from-success to-success/90 text-success-foreground hover:from-success/90 hover:to-success shadow-md hover:shadow-lg hover:shadow-success/25",
        warning: "bg-gradient-to-r from-warning to-warning/90 text-warning-foreground hover:from-warning/90 hover:to-warning shadow-md hover:shadow-lg hover:shadow-warning/25",
        glass: "glass bg-white/10 text-white border border-white/20 hover:bg-white/20 shadow-glass",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9 rounded-lg",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
