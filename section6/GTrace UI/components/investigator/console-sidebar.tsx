"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Waypoints, FileText, ScrollText, Settings, LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Graph View", icon: Waypoints },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function ConsoleSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-14 w-full shrink-0 flex-row items-center border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:h-full md:w-56 md:flex-col md:items-stretch md:border-b-0 md:border-r">
      <div className="hidden md:flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="size-2 bg-highlight shadow-[0_0_10px_var(--highlight)]" aria-hidden="true" />
        <span className="font-display text-lg leading-none">Optimus</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          OP-KESTREL
        </span>
      </div>

      <nav aria-label="Console" className="flex flex-1 flex-row gap-1 overflow-x-auto px-2 md:flex-col md:py-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 whitespace-nowrap px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 bg-highlight shadow-[0_0_8px_var(--highlight)] md:block"
                  aria-hidden="true"
                />
              )}
              <Icon className={cn("size-4", active && "text-highlight")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden md:block border-t border-sidebar-border p-3">
        <div className="mb-3 px-1">
          <p className="font-mono text-xs text-foreground">INV-2291</p>
          <p className="font-mono text-[10px] text-muted-foreground">Clearance L3 {"·"} Session active</p>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-2 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          Sign out
        </Link>
      </div>
    </aside>
  );
}
