import Image from "next/image";
import { FrascoPlaceholder } from "@/components/frasco-placeholder";
import { cn } from "@/lib/utils";

/**
 * Foto propia servida desde R2, con la silueta de frasco como fallback
 * mientras el producto no tenga ninguna cargada. Nunca imagenes de
 * Fragrantica: son referencia interna del panel.
 *
 * `object-contain` y no `cover` a proposito -- son frascos recortados sobre
 * fondo crema y recortarlos les comeria la tapa.
 */
export function FotoProducto({
  imagen,
  sizes,
  prioridad = false,
  className,
}: {
  imagen: { url: string; alt: string } | null;
  sizes: string;
  prioridad?: boolean;
  className?: string;
}) {
  if (!imagen) {
    return (
      <FrascoPlaceholder
        className={cn("h-full w-full rounded-none border-0", className)}
      />
    );
  }

  return (
    <Image
      src={imagen.url}
      alt={imagen.alt}
      fill
      sizes={sizes}
      priority={prioridad}
      className={cn("object-contain p-4", className)}
    />
  );
}
