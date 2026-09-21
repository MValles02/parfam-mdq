import { ChevronDown } from "lucide-react";
import { Logo } from "@/components/store/logo";
import { siteDefaults } from "@/lib/site";

/**
 * Homepage hero with responsive layouts and an anchor to the catalog.
 * Brand typography is intentionally fixed and the logo is the homepage h1.
 */
export function Hero() {
  return (
    <div className="relative flex h-[520px] flex-col items-center justify-center px-5 text-center lg:h-[720px]">
      <Logo size="hero" as="h1" />

      <div className="my-8 h-px w-9 bg-foreground lg:my-11 lg:w-12" />

      <p className="max-w-[90vw] text-[17px] font-light text-muted-foreground italic lg:text-[21px]">
        &ldquo;{siteDefaults.tagline}&rdquo;
      </p>

      <a
        href="#catalogo"
        className="absolute bottom-9 flex flex-col items-center gap-2.5 text-[9px] font-bold tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground lg:bottom-11 lg:text-[10px] lg:tracking-[0.34em]"
      >
        VER CATÁLOGO
        <ChevronDown className="size-4 lg:size-[18px]" />
      </a>
    </div>
  );
}
