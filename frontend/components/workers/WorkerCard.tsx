import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Star, Phone } from "@phosphor-icons/react";
import type { WorkerListing } from "@/types";

interface WorkerCardProps {
  worker: WorkerListing;
  showContact?: boolean;
  className?: string;
}

export function WorkerCard({
  worker,
  showContact = false,
  className,
}: WorkerCardProps) {
  return (
    <Card className={cn("space-y-2", className)}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-halqa-ink">
            {worker.worker_name}
          </h3>
          <Badge variant="default">{worker.category}</Badge>
        </div>
        {worker.is_verified_badge ? (
          <Badge variant="success">Verified</Badge>
        ) : null}
      </div>

      {worker.description ? (
        <p className="text-xs text-halqa-ink-light">{worker.description}</p>
      ) : null}

      <div className="flex items-center gap-4 text-xs text-halqa-ink-light">
        {worker.average_rating ? (
          <span className="flex items-center gap-1">
            <Star size={14} className="text-halqa-amber" weight="fill" />
            {worker.average_rating.toFixed(1)}
          </span>
        ) : null}
        <span>{worker.confirmed_job_count} jobs</span>
        {showContact && worker.contact_phone ? (
          <span className="flex items-center gap-1">
            <Phone size={14} />
            {worker.contact_phone}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
