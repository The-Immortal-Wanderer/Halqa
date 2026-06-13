"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { truncate } from "@/lib/utils";
import {
  WarningCircle,
  CaretRight,
} from "@phosphor-icons/react";
import type { Post } from "@/types";

interface EmergencyBannerProps {
  post: Post;
  onDismiss: () => void;
  onTap?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  power: "Power",
  security: "Security",
  infrastructure: "Infrastructure",
  water: "Water",
  general: "General",
};

export function EmergencyBanner({ post, onDismiss, onTap }: EmergencyBannerProps) {
  const [visible, setVisible] = useState(true);
  const [animatingOut, setAnimatingOut] = useState(false);
  const touchStartY = useRef(0);
  const prefersReducedMotion = useRef(false);

  const dismiss = useCallback(() => {
    setAnimatingOut(true);
    setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 250);
  }, [onDismiss]);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const timer = setTimeout(dismiss, 6000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  // Swipe-up gesture
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (deltaY > 50) {
        dismiss();
      }
    },
    [dismiss],
  );

  const handleTap = useCallback(() => {
    onTap?.();
  }, [onTap]);

  if (!visible) return null;

  const categoryLabel = post.is_emergency
    ? "Emergency"
    : CATEGORY_LABELS[post.category] ?? "General";

  return (
    <div
      onClick={handleTap}
      role="alert"
      aria-live="assertive"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "fixed left-0 right-0 top-0 z-50 flex cursor-pointer items-center gap-3 bg-halqa-amber px-4 py-3 text-white shadow-lg",
        prefersReducedMotion.current
          ? ""
          : animatingOut
            ? "animate-[halqa-slide-up_0.25s_ease-in_forwards]"
            : "animate-[halqa-slide-down_0.3s_ease-out]",
        animatingOut && !prefersReducedMotion.current &&
          "animate-[halqa-slide-up_0.25s_ease-in_forwards]",
      )}
    >
      <WarningCircle size={20} weight="fill" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold">{categoryLabel}</span>
        <p className="truncate text-sm opacity-90">
          {truncate(post.body, 60)}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        aria-label="Dismiss emergency banner"
        className="shrink-0 rounded-full p-1 hover:bg-white/20 transition-colors"
      >
        <CaretRight size={18} weight="bold" />
      </button>
    </div>
  );
}
