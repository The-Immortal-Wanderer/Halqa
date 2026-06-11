"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckCircle } from "@phosphor-icons/react";

interface ResolveButtonProps {
  postId: string;
  isResolved: boolean;
  onResolve: (postId: string) => Promise<void>;
}

export function ResolveButton({ postId, isResolved, onResolve }: ResolveButtonProps) {
  const [loading, setLoading] = useState(false);

  if (isResolved) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-halqa-success">
        <CheckCircle size={14} weight="fill" />
        Resolved
      </span>
    );
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      await onResolve(postId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      loading={loading}
    >
      Mark resolved
    </Button>
  );
}
