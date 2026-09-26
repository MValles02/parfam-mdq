import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { Logo } from "@/components/store/logo";
import { siteDefaults } from "@/lib/site";
import heroPhoto from "@/assets/images/hero.png";

/**
 * Homepage hero with responsive layouts and an anchor to the catalog.
 * Brand typography is intentionally fixed and the logo is the homepage h1.
 *
 * The bottle photo sits behind the text, so every text element is recolored
 * to the cream `--background` token and a dark gradient scrim sits between
 * the photo and the text. The scrim opacity (60%-75%) is chosen so that even
 * a literal white highlight pixel (`src/assets/images/hero.png` has real
 * (255,255,255) pixels in the area the text overlaps, confirmed by sampling
 * the file) still leaves the cream text at 4.97:1-9:1 contrast, above the
 * WCAG AA 4.5:1 floor for normal-size text.
 */
export function Hero() {
  return (
    <div className="relative flex h-[55svh] flex-col items-center justify-center overflow-hidden px-5 text-center lg:h-[68svh]">
      <Image
        src={heroPhoto}
        alt="Seis frascos de perfume sobre mármol"
        fill
        sizes="100vw"
        placeholder="blur"
        preload
        // Bottles span nearly the full width of the source photo and are
        // vertically centered, so a centered crop keeps several bottles
        // visible on narrow screens instead of cropping down to just one.
        className="object-cover object-center"
      />

      {/* Decorative scrim: darkens the photo so the cream text above stays
          AA-legible. Not interactive, so it must not intercept pointer events. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-foreground/60 via-foreground/65 to-foreground/75"
      />

      <div className="relative z-10 flex flex-col items-center">
        <Logo size="hero" as="h1" className="text-background" />

        <div className="my-8 h-px w-9 bg-background lg:my-11 lg:w-12" />

        <p className="max-w-[90vw] text-[17px] font-light text-background italic lg:text-[21px]">
          &ldquo;{siteDefaults.tagline}&rdquo;
        </p>
      </div>

      <a
        href="#catalogo"
        className="absolute bottom-9 z-10 flex flex-col items-center gap-2.5 text-[9px] font-bold tracking-[0.3em] text-background underline-offset-4 hover:underline lg:bottom-11 lg:text-[10px] lg:tracking-[0.34em]"
      >
        VER CATÁLOGO
        <ChevronDown className="size-4 lg:size-[18px]" />
      </a>
    </div>
  );
}
