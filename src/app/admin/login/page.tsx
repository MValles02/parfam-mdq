import type { Metadata } from "next";
import Link from "next/link";
import { siteDefaults } from "@/lib/site";
import { LoginForm } from "./login-form";
import { readReturnToParam } from "./return-to";

export const metadata: Metadata = {
  title: "Entrar al panel",
  robots: { index: false, follow: false },
};

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const returnTo = readReturnToParam(await props.searchParams);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-7">
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-extrabold tracking-tight">
            {siteDefaults.name}
          </span>
          <span className="pl-[0.42em] text-xs font-semibold tracking-[0.42em] text-muted-foreground uppercase">
            Panel
          </span>
        </div>

        <div className="rounded border bg-card p-7">
          <LoginForm returnTo={returnTo} />
        </div>

        <Link
          href="/"
          className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
