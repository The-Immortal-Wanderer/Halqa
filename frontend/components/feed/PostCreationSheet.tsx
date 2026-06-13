"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { postsApi } from "@/lib/api/posts";
import {
  Lightning,
  Shield,
  Wrench,
  Drop,
  ChatText,
  X,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Post } from "@/types";

interface PostCreationSheetProps {
  open: boolean;
  onClose: () => void;
  neighborhoodId: string;
  neighborhoodName: string;
  onPostCreated: (post: Post) => void;
}

interface CategoryOption {
  value: string;
  icon: React.ElementType;
  labelEn: string;
  labelUr: string;
}

const CATEGORIES: CategoryOption[] = [
  { value: "power", icon: Lightning, labelEn: "Power", labelUr: "بجلی" },
  { value: "security", icon: Shield, labelEn: "Security", labelUr: "سیکورٹی" },
  { value: "infrastructure", icon: Wrench, labelEn: "Infrastructure", labelUr: "بنیادی ڈھانچہ" },
  { value: "water", icon: Drop, labelEn: "Water", labelUr: "پانی" },
  { value: "general", icon: ChatText, labelEn: "General", labelUr: "عام" },
];

export function PostCreationSheet({
  open,
  onClose,
  neighborhoodId,
  neighborhoodName,
  onPostCreated,
}: PostCreationSheetProps) {
  const [category, setCategory] = useState("general");
  const [isEmergency, setIsEmergency] = useState(false);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setCategory("general");
      setIsEmergency(false);
      setBody("");
      setError(null);
    }
  }, [open]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const canSubmit = category && body.trim().length >= 3 && !loading;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await postsApi.create(neighborhoodId, {
        body: body.trim(),
        category,
        is_emergency: isEmergency,
      });

      if (apiError) {
        setError(apiError.message);
        return;
      }

      if (data) {
        onPostCreated(data);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setLoading(false);
    }
  }, [canSubmit, body, category, isEmergency, neighborhoodId, onPostCreated, onClose]);

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        className="relative z-10 w-full max-w-lg rounded-t-xl bg-white px-5 pb-8 pt-4 shadow-xl animate-[halqa-slide-up_0.3s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label={`Post to ${neighborhoodName}`}
      >
        {/* Handle indicator */}
        <div className="mb-4 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-halqa-sand-dark" />
        </div>

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-halqa-ink">
            Post to <span className="text-halqa-teal">{neighborhoodName}</span>
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-halqa-ink-light hover:bg-halqa-sand-mid transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Category selector */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-halqa-ink-mid">
            Category
          </label>
          <div className="space-y-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isSelected
                      ? "bg-halqa-teal-light text-halqa-teal-dark"
                      : "text-halqa-ink-mid hover:bg-halqa-sand-mid",
                  )}
                >
                  <Icon
                    size={20}
                    weight={isSelected ? "fill" : "regular"}
                    className={cn(
                      "shrink-0",
                      isSelected ? "text-halqa-teal" : "text-halqa-ink-light",
                    )}
                  />
                  <span className="flex-1 text-sm font-medium">
                    {cat.labelEn}
                  </span>
                  <span className="text-xs text-halqa-ink-light" dir="auto">
                    {cat.labelUr}
                  </span>
                  {/* Radio dot */}
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      isSelected
                        ? "border-halqa-teal"
                        : "border-halqa-sand-dark",
                    )}
                  >
                    {isSelected ? (
                      <span className="h-2 w-2 rounded-full bg-halqa-teal" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Emergency toggle */}
        <div className="mb-4 rounded-lg bg-halqa-amber-light p-3">
          <label className="flex cursor-pointer items-center gap-3">
            <button
              role="switch"
              aria-checked={isEmergency}
              onClick={() => setIsEmergency(!isEmergency)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
                isEmergency ? "bg-halqa-amber" : "bg-halqa-sand-dark",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  isEmergency ? "translate-x-[18px]" : "translate-x-0.5",
                )}
              />
            </button>
            <div className="flex-1">
              <span className="text-sm font-medium text-halqa-amber-dark">
                Is this an emergency?
              </span>
              <p className="mt-0.5 text-xs text-halqa-ink-mid">
                Other members will be notified immediately
              </p>
            </div>
            <WarningCircle size={18} className="shrink-0 text-halqa-amber" weight="fill" />
          </label>
        </div>

        {/* Textarea */}
        <div className="mb-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's happening in your neighborhood?"
            maxLength={500}
            rows={4}
            dir="auto"
            className="w-full resize-none rounded-lg border border-halqa-sand-mid bg-halqa-sand p-3 text-sm text-halqa-ink placeholder:text-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal"
          />
          <div className="mt-1 text-right text-xs text-halqa-ink-light">
            {body.length}/500
          </div>
        </div>

        {/* Error message */}
        {error ? (
          <p className="mb-3 text-sm text-halqa-danger">{error}</p>
        ) : null}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
            canSubmit
              ? "bg-halqa-teal text-white hover:bg-halqa-teal-dark"
              : "cursor-not-allowed bg-halqa-sand-dark text-halqa-ink-light",
          )}
        >
          {loading ? (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : null}
          Post to neighborhood
        </button>
      </div>
    </div>
  );
}
