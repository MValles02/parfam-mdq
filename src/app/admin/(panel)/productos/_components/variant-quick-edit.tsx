"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatArsPrice } from "@/lib/catalog";
import { variantPriceSchema } from "@/lib/validations/product";
import { setVariantActive, updateVariantPrice } from "../actions";

/** "8100.00" -> "8100", "8100.50" -> "8100,50": the input uses the es-AR format. */
function toInputValue(priceArs: string) {
  return priceArs.replace(/\.00$/, "").replace(".", ",");
}

export function VariantQuickEdit({
  variantId,
  productName,
  label,
  priceArs,
  isActive,
}: {
  variantId: string;
  productName: string;
  label: string;
  priceArs: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function savePrice() {
    const parsed = variantPriceSchema.safeParse({
      variantId,
      priceArs: draft,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá el precio.");
      return;
    }
    startTransition(async () => {
      // The raw input goes to the server, which parses it again: the parsed
      // value has already lost its thousands separators.
      const result = await updateVariantPrice(variantId, draft);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  function toggleActive() {
    startTransition(async () => {
      const result = await setVariantActive(variantId, !isActive);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        {isEditing ? (
          <>
            <Input
              inputMode="numeric"
              autoFocus
              className="w-28"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={`Precio: ${productName} ${label}`}
            />
            <Button onClick={savePrice} disabled={isPending}>
              OK
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            className="border-dashed tabular-nums"
            onClick={() => {
              setDraft(toInputValue(priceArs));
              setIsEditing(true);
            }}
            aria-label={`Cambiar precio: ${productName} ${label}`}
          >
            {formatArsPrice(priceArs)}
          </Button>
        )}
        <Switch
          checked={isActive}
          onCheckedChange={toggleActive}
          disabled={isPending}
          aria-label={`Presentación activa: ${productName} ${label}`}
        />
      </div>
    </div>
  );
}
