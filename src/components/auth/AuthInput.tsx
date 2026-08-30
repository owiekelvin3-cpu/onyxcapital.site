"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, ChevronDown } from "@/components/icons";

function AuthFieldShell({
  focused,
  error,
  children,
}: {
  focused: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      animate={{
        borderColor: error
          ? "var(--red)"
          : focused
            ? "var(--brand-accent)"
            : "var(--border)",
        boxShadow: focused
          ? "0 0 0 3px color-mix(in srgb, var(--brand-accent) 18%, transparent)"
          : error
            ? "0 0 0 3px color-mix(in srgb, var(--red) 12%, transparent)"
            : "none",
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative flex items-center rounded-xl border bg-bg-secondary/80",
        error && "border-red"
      )}
    >
      {children}
    </motion.div>
  );
}

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  showRequired?: boolean;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, label, icon, error, id, type, showRequired, required, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="space-y-1">
        <label htmlFor={id} className="block text-[12px] font-medium text-text-secondary sm:text-[13px]">
          {label}
          {(showRequired ?? required) && (
            <span className="ml-0.5 text-red" aria-hidden>
              *
            </span>
          )}
        </label>
        <AuthFieldShell focused={focused} error={error}>
          {icon && (
            <span className="shrink-0 pl-3.5 text-text-tertiary [&>svg]:h-[18px] [&>svg]:w-[18px]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            type={inputType}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "auth-field min-w-0 flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-tertiary/60 focus:outline-none",
              icon ? "pl-2.5 pr-3" : "px-3.5",
              isPassword && "pr-11",
              type === "date" && "cursor-pointer pr-3 [color-scheme:dark]",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 flex h-full cursor-pointer items-center px-3.5 text-text-tertiary transition-colors hover:text-text-primary"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          )}
        </AuthFieldShell>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-0.5 text-[12px] text-red"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);
AuthInput.displayName = "AuthInput";

interface AuthSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  showRequired?: boolean;
}

export const AuthSelect = forwardRef<HTMLSelectElement, AuthSelectProps>(
  ({ className, label, error, id, showRequired, required, children, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <div className="space-y-1">
        <label htmlFor={id} className="block text-[12px] font-medium text-text-secondary sm:text-[13px]">
          {label}
          {(showRequired ?? required) && (
            <span className="ml-0.5 text-red" aria-hidden>
              *
            </span>
          )}
        </label>
        <AuthFieldShell focused={focused} error={error}>
          <select
            ref={ref}
            id={id}
            required={required}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "auth-field min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pl-3.5 pr-10 text-[15px] text-text-primary focus:outline-none",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 h-4 w-4 text-text-tertiary" />
        </AuthFieldShell>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-0.5 text-[12px] text-red"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);
AuthSelect.displayName = "AuthSelect";

export function AuthTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-8 flex border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative flex-1 cursor-pointer pb-3 text-[15px] font-medium transition-colors",
            active === tab.id
              ? "text-text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-brand"
              : "text-text-tertiary hover:text-text-secondary"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
