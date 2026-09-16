import { siteDefaults } from "@/lib/site";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl">
        {siteDefaults.name}
      </h1>
      <p className="text-xs font-medium tracking-[0.5em] uppercase sm:text-sm">
        Perfumeria
      </p>
      <p className="mt-6 text-lg text-muted-foreground">
        &ldquo;{siteDefaults.tagline}&rdquo;
      </p>
    </main>
  );
}
