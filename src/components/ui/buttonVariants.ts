import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-semibold transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border-2 border-primary bg-transparent text-primary shadow-sm hover:bg-primary/10",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90",
        orange:
          "bg-orange-raw text-navy shadow-sm hover:bg-orange-raw/90",
        ghost: "bg-transparent text-foreground hover:bg-purple/10",
        link: "h-auto min-h-0 bg-transparent p-0 text-orange underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[50px] rounded-pill px-8 py-3",
        sm: "h-10 rounded-pill px-5 text-xs",
        lg: "h-[56px] rounded-pill px-10",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
