import { cn } from "@/lib/utils";
import { siteDefaults } from "@/lib/site";

/**
 * The logo is typography rather than SVG. The brand uses Outfit at weight 800
 * with a spaced small-caps subtitle.
 */
export function Logo({
  size = "header",
  as: Tag = "span",
  className,
}: {
  size?: "header" | "hero" | "footer";
  /** Use h1 when the logo is the page title, as in the hero. */
  as?: "span" | "h1";
  className?: string;
}) {
  const styles = {
    header: {
      name: "text-xl",
      subtitle: "text-[10px] tracking-[0.42em]",
    },
    hero: {
      name: "text-6xl sm:text-8xl lg:text-[132px]",
      subtitle:
        "text-background text-[11px] sm:text-[15px] lg:text-[17px] tracking-[0.5em] lg:tracking-[0.62em] mt-4 lg:mt-5",
    },
    footer: { name: "text-2xl", subtitle: "sr-only" },
  }[size];

  return (
    <Tag className={cn("flex flex-col items-center gap-0.5", className)}>
      <span
        className={cn(
          "leading-[0.9] font-extrabold tracking-[-0.03em]",
          styles.name,
        )}
      >
        {siteDefaults.name}
      </span>
      {/* Letter spacing shifts the last character, so left padding re-centers it. */}
      <span
        className={cn(
          "pl-[0.42em] font-semibold text-muted-foreground uppercase",
          styles.subtitle,
        )}
      >
        Perfumería
      </span>
    </Tag>
  );
}
