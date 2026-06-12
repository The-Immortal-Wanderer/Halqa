"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="w-full">
        {label ? (
          <label className="mb-1 block text-sm font-medium text-halqa-ink">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            type={visible ? "text" : "password"}
            className={cn(
              "w-full rounded-md border border-halqa-sand-dark bg-white px-3 py-2 pr-10 text-sm text-halqa-ink placeholder:text-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal disabled:opacity-50",
              error &&
                "border-halqa-danger focus:border-halqa-danger focus:ring-halqa-danger",
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-halqa-ink-light hover:text-halqa-ink"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error ? (
          <p className="mt-1 text-xs text-halqa-danger">{error}</p>
        ) : null}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
