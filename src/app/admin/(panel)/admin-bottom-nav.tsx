"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { NAV } from "./admin-sidebar";

// Marcas and Configuración stay in the sidebar sheet that "Más" opens.
const BOTTOM_ITEMS = NAV.slice(0, 3);

const itemClass =
  "relative flex flex-col items-center justify-center gap-1 text-xs font-medium";

export function AdminBottomNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      aria-label="Panel"
      className="fixed inset-x-0 bottom-0 z-40 grid h-17 grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {BOTTOM_ITEMS.map((item) => {
        // Same rule as the sidebar: `/admin` is exact, the rest include subroutes.
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              itemClass,
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
            {item.href === "/admin/pedidos" && pendingCount > 0 ? (
              <span className="absolute top-2 left-1/2 ml-2 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className={cn(itemClass, "text-muted-foreground")}
      >
        <Ellipsis className="size-5" />
        Más
      </button>
    </nav>
  );
}
