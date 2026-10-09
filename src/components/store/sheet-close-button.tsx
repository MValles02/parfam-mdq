import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { cn, FOCUS_VISIBLE } from "@/lib/utils";

/**
 * Close button for store sheets opened with `showCloseButton={false}`. The
 * built-in one is a small touch target with an English label; this one is
 * 44 px below `lg`, returns to the compact size from `lg` up, and reads
 * "Cerrar".
 */
export function SheetCloseButton() {
  return (
    <SheetClose asChild>
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          "absolute top-1 right-1 size-11 lg:top-3 lg:right-3 lg:size-7",
          FOCUS_VISIBLE,
        )}
      >
        <XIcon />
        <span className="sr-only">Cerrar</span>
      </Button>
    </SheetClose>
  );
}
