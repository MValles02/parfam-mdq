import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "./admin-sidebar";
import { UserMenu } from "./user-menu";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  /**
   * Éste es el control de acceso real. `proxy.ts` ya redirige antes de llegar
   * acá, pero eso es sólo una optimización de UX: la autorización que cuenta
   * es ésta, del lado del servidor y pegada a los datos.
   */
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  return (
    // El sidebar colapsado muestra tooltips, y Radix los exige dentro de un
    // TooltipProvider. Va acá y no en el layout raíz para no cargar ese JS
    // de cliente en toda la tienda.
    <TooltipProvider>
      {/* nuqs mantiene los filtros de las tablas en la URL (ver AGENTS.md).
          El adapter va acá y no en el layout raíz porque hoy el único estado
          en la URL es el del panel. */}
      <NuqsAdapter>
        <SidebarProvider>
          <AdminSidebar>
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
