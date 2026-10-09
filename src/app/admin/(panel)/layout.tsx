import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { countPendingOrders } from "@/lib/admin/orders";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "./admin-sidebar";
import { UserMenu } from "./user-menu";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  /**
   * This is the render-time access check. `proxy.ts` redirects earlier as a
   * UX optimization, while Server Actions authorize independently.
   */
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const pendingCount = await countPendingOrders();

  return (
    // The collapsed sidebar shows tooltips, which Radix requires under a
    // TooltipProvider. Keeping it here avoids loading that client JavaScript
    // across the store.
    <TooltipProvider>
      {/* nuqs keeps table filters in the URL. The adapter stays here because
          this panel is the only current consumer of URL state. */}
      <NuqsAdapter>
        <SidebarProvider>
          <AdminSidebar pendingCount={pendingCount}>
            <UserMenu
              name={session.user.name ?? "Admin"}
              email={session.user.email ?? ""}
            />
          </AdminSidebar>

          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
              <SidebarTrigger />
            </header>
            <div className="flex-1">{children}</div>
          </SidebarInset>
          <Toaster position="top-right" richColors />
        </SidebarProvider>
      </NuqsAdapter>
    </TooltipProvider>
  );
}
