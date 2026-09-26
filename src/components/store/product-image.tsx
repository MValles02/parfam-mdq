import Image from "next/image";
import { BottlePlaceholder } from "@/components/bottle-placeholder";
import { cn } from "@/lib/utils";

/**
 * An R2-served product photo with a bottle silhouette fallback when no photo
 * is uploaded. Photos are either a manual admin upload or a single copy of
 * the adopted Fragrantica reference picture made at adoption time; the
 * Fragrantica dataset itself stays internal panel reference material and is
 * never served to the store.
 *
 * `fit="contain"` is the default: it preserves the full bottle, caps
 * included, against the cream padding used by the detail gallery and
 * thumbnails. Catalog cards pass `fit="cover"` so a 3:4 portrait photo fills
 * its aspect-ratio box edge to edge instead of shrinking to a small centered
 * rectangle.
 */
export function ProductImage({
  image,
  sizes,
  priority = false,
  fit = "contain",
  className,
}: {
  image: { url: string; alt: string } | null;
  sizes: string;
  priority?: boolean;
  fit?: "contain" | "cover";
  className?: string;
}) {
  if (!image) {
    return (
      <BottlePlaceholder
        className={cn("h-full w-full rounded-none border-0", className)}
      />
    );
  }

  return (
    <Image
      src={image.url}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn(
        fit === "cover" ? "object-cover" : "object-contain p-4",
        className,
      )}
    />
  );
}
