import Image from "next/image";
import { BottlePlaceholder } from "@/components/bottle-placeholder";
import { cn } from "@/lib/utils";

/**
 * An R2-served product photo with a bottle silhouette fallback when no photo
 * is uploaded. Fragrantica images are never used because they are internal
 * panel references.
 *
 * It intentionally uses `object-contain` instead of `cover`: the bottle
 * photos are cropped against a cream background, and further cropping would
 * remove their caps.
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
      className={cn("object-contain p-4", className)}
    />
  );
}
