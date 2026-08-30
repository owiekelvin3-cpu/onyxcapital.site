import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "brand" | "outline" | "ghost" | "secondary" | "premium";
  size?: "sm" | "md" | "lg";
}

const variants = {
  brand:
    "bg-gradient-brand text-brand-text font-semibold shadow-[var(--shadow-glow)] hover:opacity-95 active:scale-[0.98]",
  premium:
    "bg-gradient-brand text-brand-text font-semibold shadow-[var(--shadow-premium)] hover:shadow-[var(--shadow-glow)] active:scale-[0.98]",
  outline:
    "border border-border-light text-text-primary hover:border-brand/40 hover:bg-brand-light/30 backdrop-blur-sm",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
  secondary:
    "bg-bg-tertiary text-text-primary hover:bg-bg-hover border border-border",
};

const sizes = {
  sm: "h-8 px-4 text-xs rounded-xl",
  md: "h-10 px-5 text-sm rounded-xl",
  lg: "h-12 px-8 text-sm rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "brand", size = "md", children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
