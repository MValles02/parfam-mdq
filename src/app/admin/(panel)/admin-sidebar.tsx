"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingBag, Languages, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { siteDefaults } from "@/lib/site";

const NAV = [
  { href: "/admin", label: "Inicio", icon: Home },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/notas", label: "Notas sin traducir", icon: Languages },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
] as const;

export function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-5 group-data-[collapsible=icon]:p-2">
        <Link href="/admin" className="flex flex-col gap-1">
          <span className="text-lg leading-none font-extrabold tracking-tight group-data-[collapsible=icon]:hidden">
            {siteDefaults.name}
          </span>
          <span className="text-[9px] font-semibold tracking-[0.24em] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
            PANEL
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                // `/admin` sólo coincide exacto; el resto también en sus subrutas.
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {children}
      </SidebarFooter>
    </Sidebar>
  );
}
