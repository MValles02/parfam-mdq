import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/store/logo";
import { siteDefaults } from "@/lib/site";
import { CATALOG_HREF } from "@/lib/store/links";
import { FOCUS_VISIBLE, cn } from "@/lib/utils";
import heroPhoto from "@/assets/images/hero.png";

/**
 * Homepage hero with responsive layouts.
 * Brand typography is intentionally fixed and the logo is the homepage h1.
 *
 * The bottle photo sits behind the text, so every text element is recolored
 * to the cream `--background` token and a dark gradient scrim sits between
 * the photo and the text. The scrim opacity (60%-75%) is chosen so that even
 * a literal white highlight pixel (`src/assets/images/hero.png` has real
 * (255,255,255) pixels in the area the text overlaps, confirmed by sampling
 * the file) still leaves the cream text at 4.97:1-9:1 contrast, above the
 * WCAG AA 4.5:1 floor for normal-size text. The gradient spans the full hero
 * height, so the stacked eyebrow, headline and body copy keep that floor at
 * any vertical position.
 */
export function Hero() {
  return (
    <div className="relative mx-4 mt-4 flex min-h-[40svh] flex-col justify-center overflow-hidden rounded px-5 py-10 lg:mx-0 lg:mt-0 lg:h-[68svh] lg:rounded-none lg:px-0">
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

      <div className="relative z-10 mx-auto flex w-full max-w-page flex-col items-start gap-3 text-background lg:px-16">
        <p className="text-xs font-medium tracking-[0.16em] uppercase">
          Originales · Mar del Plata
        </p>
        <Logo size="hero" as="h1" className="text-background" />
        <p className="max-w-[90vw] text-[17px] font-light italic lg:text-[21px]">
          {siteDefaults.tagline}.
        </p>
        <p className="max-w-[32ch] text-sm lg:max-w-[52ch] lg:text-base">
          Probalo en decant o llevá el frasco entero. Lo coordinamos por
          WhatsApp.
        </p>
        <div className="mt-3 flex flex-col items-start gap-3 lg:flex-row">
          <Link
            href={CATALOG_HREF}
            className={cn(
              "flex min-h-11 items-center rounded bg-background px-6 text-sm font-medium text-foreground",
              FOCUS_VISIBLE,
            )}
          >
            Ver fragancias
          </Link>
          <Link
            href="/presentaciones"
            className={cn(
              "hidden min-h-11 items-center rounded border border-background px-6 text-sm font-medium text-background lg:flex",
              FOCUS_VISIBLE,
            )}
          >
            ¿Frasco o decant?
          </Link>
        </div>
      </div>
    </div>
  );
}
