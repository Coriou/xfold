import { scanForExtremeStats } from "@/lib/archive/insights/extreme-stats";
import type { ComputeContext } from "../../types";

export interface ReceiptCardProps {
  readonly username: string;
  readonly value: string;
  readonly label: string;
  readonly contextLine: string;
  readonly shareability: number;
}

export function computeReceipt(ctx: ComputeContext): ReceiptCardProps | null {
  const stats = scanForExtremeStats(ctx.archive);
  const top = stats[0];
  if (!top || top.value <= 0) return null;

  return {
    username: ctx.archive.meta.username,
    value: top.value.toLocaleString("en-US"),
    label: top.label,
    contextLine: top.contextLine,
    shareability: top.shareability,
  };
}

export function computeReceiptShareability(props: ReceiptCardProps): number {
  return props.shareability;
}
