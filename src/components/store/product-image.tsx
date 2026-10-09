import Image from "next/image";
import { BottlePlaceholder } from "@/components/bottle-placeholder";

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
 * `ProductImage` must have the opaque page surface (`bg-background`; `bg-card`
 * is a lighter token that leaves the white visible) and `isolate`, so the
 * blend only mixes with that surface and not with anything painted behind
 * it. The store has no dark mode — see A.9 in
 * `design-system/parfam-mdq/MASTER.md` — so the blend does not need a
 * `dark:` variant.
 */
export function ProductImage({
  image,
  sizes,
  priority = false,
}: {
  image: { url: string; alt: string } | null;
  sizes: string;
  priority?: boolean;
}) {
  if (!image) {
    return (
      <BottlePlaceholder className="h-full w-full rounded-none border-0" />
    );
  }

  return (
    <Image
      src={image.url}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-contain p-4 mix-blend-multiply"
    />
  );
}
