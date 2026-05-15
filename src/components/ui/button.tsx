import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base — Lexend font, pill shape, 44px min touch target, no tap flash
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-semibold text-sm transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9973CE] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Coral filled pill — primary CTA (white text on #F4483F = 3.6:1 AA large)
        default:
          "bg-[#F4483F] text-white hover:bg-[#d93b32] shadow-sm",
        // Purple filled
        secondary:
          "bg-[#9973CE] text-white hover:bg-[#7d5bb8]",
        // Outline coral
        outline:
          "border-2 border-[#F4483F] text-[#F4483F] bg-transparent hover:bg-[#F4483F10]",
        // Orange filled — Allow Location/Camera
        orange:
          "bg-[#FA8100] text-[#18112C] hover:bg-[#e07500]",
        // Ghost — header icon buttons
        ghost:
          "bg-transparent text-[#18112C] hover:bg-[#9973CE15]",
        // Link — accessible orange (#C46200 on light bg = 4.7:1)
        link:
          "bg-transparent text-[#C46200] underline-offset-4 hover:underline p-0 h-auto min-h-0",
        destructive:
          "bg-[#F4483F] text-white hover:bg-[#d93b32]",
      },
      size: {
        default: "h-[50px] px-8 rounded-[39px]",   // matches Figma pill exactly
        sm:      "h-10 px-5  rounded-[39px] text-xs",
        lg:      "h-[56px] px-10 rounded-[39px]",
        icon:    "h-10 w-10 rounded-full",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
