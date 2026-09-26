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
 * It uses `object-contain p-4` rather than `cover`: reference photos are
 * cropped against a white background, and cropping further would remove
 * bottle caps.
 *
 * Reference photos keep Fragrantica's white background, while the store's
 * own palette is cream (`--background` / `--card`, see
 * `design-system/parfam-mdq/MASTER.md`). `mix-blend-multiply` makes white
 * pixels transparent against the surface behind the image, so the photo
 * blends into whichever token-backed container renders it, instead of
 * showing a visible white rectangle. Multiply darkens non-white pixels in
 * proportion to how dark the backdrop is, so every container that renders a
 * `ProductImage` must have an opaque light surface (`bg-background` or
 * `bg-card`) and `isolate`, so the blend only mixes with that surface and not
 * with anything painted behind it. The store has no dark mode — see A.9 in
 * `design-system/parfam-mdq/MASTER.md` — so the blend does not need a
 * `dark:` variant.
 */
export function ProductImage({
  image,
  sizes,
  priority = false,
  className,
}: {
  image: { url: string; alt: string } | null;
  sizes: string;
  priority?: boolean;
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
      className={cn("object-contain p-4 mix-blend-multiply", className)}
    />
  );
}
