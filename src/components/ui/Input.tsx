import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs text-text-tertiary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          "w-full h-10 px-3 bg-bg-primary border border-border rounded text-base sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand transition-colors",
          error && "border-red",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";
