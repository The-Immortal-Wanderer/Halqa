import { cn } from "@/lib/utils";

interface CategoryItem {
  label: string;
  count: number;
  resolved: number;
  color: string;
}

interface CategoryBreakdownProps {
  categories: CategoryItem[];
  className?: string;
}

export function CategoryBreakdown({
  categories,
  className,
}: CategoryBreakdownProps) {
  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {categories.map((cat) => (
        <div key={cat.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-halqa-ink">{cat.label}</span>
            <span className="text-halqa-ink-light">
              {cat.resolved}/{cat.count} resolved
            </span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-halqa-sand-mid">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(cat.count / maxCount) * 100}%`,
                backgroundColor: cat.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
