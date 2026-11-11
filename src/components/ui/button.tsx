import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold cursor-pointer transition-[background-color,color,box-shadow,transform] duration-150 active:translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-bronze disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:bg-charcoal-3",
        bronze: "bg-bronze text-bronze-foreground shadow-soft hover:bg-bronze/85",
        success: "bg-success text-success-foreground shadow-soft hover:bg-success/90",
        destructive: "bg-danger text-danger-foreground shadow-soft hover:bg-danger/90",
        "destructive-outline":
          "border border-danger/40 bg-surface text-danger-ink hover:bg-danger-soft",
        outline: "border border-input bg-surface text-foreground hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        link: "text-bronze-ink underline underline-offset-4 hover:text-foreground",
        "on-dark": "bg-cream text-charcoal hover:bg-bronze",
        "ghost-dark": "text-cream/80 hover:bg-charcoal-3 hover:text-cream",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 px-6 text-[0.95rem]",
        xl: "h-13 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
