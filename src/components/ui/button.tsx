import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs sm:text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/25 hover:shadow-lg",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/25",
        outline:
          "border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "hover:bg-gray-100 text-gray-700 hover:text-gray-900",
        link: "text-blue-600 underline-offset-4 hover:underline",
        success: "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-500/25",
        purple: "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-500/25",
      },
      size: {
        default: "h-9 px-3 py-2 sm:h-10 sm:px-5",
        sm: "h-8 rounded-lg px-3 text-xs sm:h-9 sm:px-4",
        lg: "h-11 rounded-lg px-6 text-sm sm:h-12 sm:px-8 sm:text-base",
        icon: "h-9 w-9 sm:h-10 sm:w-10 rounded-lg",
        xs: "h-7 px-2 text-xs rounded-md",
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
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success" | "purple"
  size?: "default" | "sm" | "lg" | "icon" | "xs"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant: variant || "default", size: size || "default", className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
