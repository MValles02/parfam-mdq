"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatArsPrice } from "@/lib/catalog";
import type { PriceChange } from "@/lib/store/use-cart-reconciliation";

/** Notice shown after reconciliation changed prices; shared by cart and checkout. */
export function PriceChangeAlert({
  changes,
  onDiscard,
}: {
  changes: PriceChange[];
  onDiscard: () => void;
}) {
  if (changes.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTitle>Actualizamos algunos precios</AlertTitle>
      <AlertDescription>
        <ul className="flex flex-col gap-1">
          {changes.map((change) => (
            <li key={change.variantId}>
              {change.productName} · {change.variantLabel}:{" "}
              <span className="line-through">
                {formatArsPrice(change.previousPriceArs)}
              </span>{" "}
              ahora {formatArsPrice(change.currentPriceArs)}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={onDiscard}
        >
          Entendido, continuar
        </Button>
      </AlertDescription>
    </Alert>
  );
}
