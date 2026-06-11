"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { Tier3VouchingRequest } from "@/types";

interface VouchingPanelProps {
  requests: Tier3VouchingRequest[];
  onVouch: (candidateMembershipId: string) => Promise<void>;
  onCoSign: (vouchingRequestId: string) => Promise<void>;
  className?: string;
}

export function VouchingPanel({
  requests,
  onVouch,
  onCoSign,
  className,
}: VouchingPanelProps) {
  if (requests.length === 0) {
    return (
      <div className={cn("text-center py-8 text-sm text-halqa-ink-light", className)}>
        No pending vouching requests.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {requests.map((req) => (
        <Card key={req.id}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-halqa-ink">
                {req.candidate_display_name}
              </h3>
              <Badge
                variant={
                  req.status === "pending" ? "default" : "success"
                }
              >
                {req.status}
              </Badge>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {!req.anchor_signed ? (
              <Button
                size="sm"
                onClick={() => onVouch(req.candidate_user_id)}
              >
                Vouch as anchor
              </Button>
            ) : null}
            {!req.cosigner_signed && req.anchor_signed ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onCoSign(req.id)}
              >
                Co-sign
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
