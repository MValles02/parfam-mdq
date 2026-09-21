import type { Metadata } from "next";
import { siteDefaults } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar al panel",
  robots: { index: false, follow: false },
};

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const searchParams = await props.searchParams;
  // `volverA` is the established query parameter accepted by the login route.
  const returnTo =
    typeof searchParams.volverA === "string" ? searchParams.volverA : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-1">
          <span className="text-3xl font-extrabold tracking-tight">
            {siteDefaults.name}
          </span>
          <span className="text-[10px] font-semibold tracking-[0.42em] text-muted-foreground">
            PANEL
          </span>
        </div>

        <LoginForm returnTo={returnTo} />
      </div>
    </main>
  );
}
