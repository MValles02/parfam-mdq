"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/generated/prisma/enums";
import { changeOrderStatus } from "../actions";

/**
 * Advances an order to its next lifecycle step or cancels it. Labels come in
 * as props because the label module imports Prisma.
 */
export function NextStatusActions({
  id,
  status,
  nextStatus,
  labels,
}: {
  id: string;
  status: OrderStatus;
  nextStatus: OrderStatus | null;
  labels: Record<OrderStatus, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(target: OrderStatus) {
    startTransition(async () => {
      const result = await changeOrderStatus(id, target);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Estado actualizado.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {nextStatus ? (
        <Button disabled={isPending} onClick={() => change(nextStatus)}>
          Pasar a {labels[nextStatus]}
        </Button>
      ) : null}
      {status !== "CANCELLED" && status !== "DELIVERED" ? (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => change("CANCELLED")}
        >
          Cancelar pedido
        </Button>
      ) : null}
    </div>
  );
}
