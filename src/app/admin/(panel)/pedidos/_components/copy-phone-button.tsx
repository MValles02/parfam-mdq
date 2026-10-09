"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyPhoneButton({ phone }: { phone: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(phone);
          toast.success("Teléfono copiado.");
        } catch {
          toast.error("No se pudo copiar el teléfono.");
        }
      }}
    >
      <Copy />
      Copiar teléfono
    </Button>
  );
}
