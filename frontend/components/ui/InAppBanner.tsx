"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "@phosphor-icons/react";

interface InAppBannerProps {
  type?: "emergency" | "info" | "success";
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const STYLES = {
  emergency: "bg-halqa-amber text-white",
  info: "bg-halqa-teal text-white",
  success: "bg-halqa-success text-white",
} as const;

export function InAppBanner({
  type = "info",
  message,
  onDismiss,
  className,
}: InAppBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 text-sm font-medium",
        STYLES[type],
        className,
      )}
      role="alert"
    >
      <span>{message}</span>
      <button
        onClick={handleDismiss}
        className="ml-4 shrink-0 opacity-80 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
    </div>
  );
}
