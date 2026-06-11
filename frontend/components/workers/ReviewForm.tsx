"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Star } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  onSubmit: (rating: number, reviewText: string, jobConfirmed: boolean) => Promise<void>;
}

export function ReviewForm({ onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [jobConfirmed, setJobConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = rating > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await onSubmit(rating, reviewText, jobConfirmed);
      setRating(0);
      setReviewText("");
      setJobConfirmed(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Star rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="text-halqa-sand-dark hover:text-halqa-amber transition-colors"
          >
            <Star
              size={24}
              weight={(hoveredRating || rating) >= star ? "fill" : "regular"}
              className={cn(
                (hoveredRating || rating) >= star
                  ? "text-halqa-amber"
                  : "text-halqa-sand-dark",
              )}
            />
          </button>
        ))}
      </div>

      {/* Review text */}
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Write your review (optional)"
        className="w-full resize-none rounded-md border border-halqa-sand-dark bg-white p-3 text-sm text-halqa-ink placeholder:text-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal"
        rows={3}
        maxLength={500}
      />

      {/* Job confirmed checkbox */}
      <label className="flex items-center gap-2 text-sm text-halqa-ink cursor-pointer">
        <input
          type="checkbox"
          checked={jobConfirmed}
          onChange={(e) => setJobConfirmed(e.target.checked)}
          className="rounded border-halqa-sand-dark text-halqa-teal focus:ring-halqa-teal"
        />
        I confirm this job was completed
      </label>

      <Button onClick={handleSubmit} loading={loading} disabled={!canSubmit} fullWidth>
        Submit review
      </Button>
    </div>
  );
}
