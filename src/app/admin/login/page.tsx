import type { Metadata } from "next";
import Link from "next/link";
import { siteDefaults } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar al panel",
  robots: { index: false, follow: false },
};

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const searchParams = await props.searchParams;
  // Accept older bookmarked login links while newly generated links use returnTo.
  const returnTo =
    typeof searchParams.returnTo === "string"
      ? searchParams.returnTo
      : typeof searchParams.volverA === "string"
        ? searchParams.volverA
        : undefined;

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
