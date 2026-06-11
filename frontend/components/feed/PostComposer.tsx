"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { PostCategory } from "@/types";

interface PostComposerProps {
  onSubmit: (content: string, category: PostCategory) => Promise<void>;
  className?: string;
  placeholder?: string;
}

const CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "power", label: "Power" },
  { value: "water", label: "Water" },
  { value: "security", label: "Security" },
  { value: "infrastructure", label: "Infrastructure" },
];

export function PostComposer({
  onSubmit,
  className,
  placeholder = "What's happening in your neighborhood?",
}: PostComposerProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("general");
  const [loading, setLoading] = useState(false);

  const canSubmit = content.trim().length >= 2 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await onSubmit(content, category);
      setContent("");
      setCategory("general");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("rounded-lg border border-halqa-sand-mid bg-white p-4", className)}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none text-sm text-halqa-ink placeholder:text-halqa-ink-light focus:outline-none"
        rows={3}
        maxLength={1000}
      />
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                category === cat.value
                  ? "bg-halqa-teal text-white"
                  : "bg-halqa-sand text-halqa-ink-mid hover:bg-halqa-sand-mid",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={handleSubmit} loading={loading} disabled={!canSubmit}>
          Post
        </Button>
      </div>
    </div>
  );
}
