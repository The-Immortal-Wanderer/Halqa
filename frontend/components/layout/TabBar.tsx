"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  House,
  Bell,
  Users,
  Briefcase,
  ChartBar,
  ShieldCheck,
} from "@phosphor-icons/react";
import { anchorApi } from "@/lib/api/anchor";

const TABS = [
  { label: "Feed", icon: House, href: "" },
  { label: "Alerts", icon: Bell, href: "/alerts" },
  { label: "Community", icon: Users, href: "/community" },
  { label: "Directory", icon: Briefcase, href: "/directory" },
  { label: "Dashboard", icon: ChartBar, href: "/dashboard" },
] as const;

interface TabBarProps {
  currentPath?: string;
}

export function TabBar({ currentPath = "" }: TabBarProps) {
  const pathname = usePathname();
  // Extract neighborhoodId from path: /neighborhood/{neighborhoodId}/...
  const neighborhoodId = pathname?.match(/\/neighborhood\/([^/]+)/)?.[1];
  const [isAnchor, setIsAnchor] = useState(false);

  useEffect(() => {
    if (!neighborhoodId) {
      setIsAnchor(false);
      return;
    }
    let cancelled = false;
    anchorApi.getStatus(neighborhoodId).then((res) => {
      if (!cancelled && res.data?.is_anchor) {
        setIsAnchor(true);
      }
    });
    return () => { cancelled = true; };
  }, [neighborhoodId]);

  const anchorTab = isAnchor
    ? [{ label: "Anchor", icon: ShieldCheck, href: `/neighborhood/${neighborhoodId}/anchor` }]
    : [];

  const allTabs = [...TABS, ...anchorTab];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-halqa-sand-mid bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {allTabs.map((tab) => {
          const isActive = currentPath.startsWith(tab.href);
          return (
            <a
              key={tab.label}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-halqa-teal"
                  : "text-halqa-ink-light hover:text-halqa-ink-mid",
              )}
            >
              <tab.icon size={22} weight={isActive ? "fill" : "regular"} />
              <span>{tab.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
