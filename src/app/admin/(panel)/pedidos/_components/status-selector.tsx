"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { OrderStatus } from "@/generated/prisma/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeOrderStatus } from "../actions";

const STATUS_ORDER: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "DELIVERED",
  "CANCELLED",
];

/**
 * Labels are passed as props instead of importing `ORDER_STATUS_LABELS`
 * directly because that module also imports Prisma, which cannot enter the
 * Client Component bundle.
 */
export function StatusSelector({
  id,
  status,
  labels,
}: {
  id: string;
  status: OrderStatus;
  labels: Record<OrderStatus, string>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeStatus(value: string) {
    const nextStatus = value as OrderStatus;
    if (nextStatus === status) return;
    startTransition(async () => {
      const result = await changeOrderStatus(id, nextStatus);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Estado actualizado.");
      router.refresh();
    });
  }

  return (
    <Select value={status} onValueChange={changeStatus} disabled={isPending}>
      <SelectTrigger size="default" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((orderStatus) => (
          <SelectItem key={orderStatus} value={orderStatus}>
            {labels[orderStatus]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
