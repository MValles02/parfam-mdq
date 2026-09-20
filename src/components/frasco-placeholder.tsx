import { cn } from "@/lib/utils";

/**
 * Silueta de frasco para cuando todavía no hay foto propia, pintada con
 * tokens en vez de hexadecimales para que siga la paleta de `globals.css`.
 */
export function FrascoPlaceholder({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-sm border bg-background",
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 120 190"
        fill="none"
        className="h-[72%] w-auto text-border"
      >
        <rect x="44" y="6" width="32" height="26" rx="3" fill="currentColor" />
        <rect
          x="18"
          y="46"
          width="84"
          height="134"
          rx="4"
          className="fill-secondary"
          stroke="currentColor"
          strokeWidth="4"
        />
      </svg>
    </span>
  );
}
