import { cn } from "@/lib/utils";
import {
  House,
  Bell,
  Users,
  Briefcase,
  ChartBar,
} from "@phosphor-icons/react";

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
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-halqa-sand-mid bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {TABS.map((tab) => {
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
