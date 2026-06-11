import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label ? (
          <label className="mb-1 block text-sm font-medium text-halqa-ink">
            {label}
          </label>
        ) : null}
        <div className="relative">
          {leftIcon ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              {leftIcon}
            </div>
          ) : null}
          <input
            ref={ref}
            className={cn(
              "w-full rounded-md border border-halqa-sand-dark bg-white px-3 py-2 text-sm text-halqa-ink placeholder:text-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal disabled:opacity-50",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-halqa-danger focus:border-halqa-danger focus:ring-halqa-danger",
              className,
            )}
            {...props}
          />
          {rightIcon ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-halqa-danger">{error}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
