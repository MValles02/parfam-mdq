"use client";

import { LogOut } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cerrarSesion } from "./actions";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const initial = (name || email).charAt(0).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-3 px-2 py-1.5 group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-bold text-sidebar-accent-foreground">
            {initial}
          </div>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">{name}</span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {email}
            </span>
          </div>
        </div>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <form action={cerrarSesion} className="w-full">
          <SidebarMenuButton type="submit" tooltip="Cerrar sesión">
            <LogOut />
            <span>Cerrar sesión</span>
          </SidebarMenuButton>
        </form>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
