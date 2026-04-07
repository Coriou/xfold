import type { ShareCardModule } from "../../types";
import { ReceiptCard } from "./card";
import {
  computeReceipt,
  computeReceiptShareability,
  type ReceiptCardProps,
} from "./compute";

export const receiptCard: ShareCardModule<ReceiptCardProps> = {
  meta: {
    id: "receipt",
    title: "The Receipt",
    tagline: "One shocking number, auto-picked from your archive",
    category: "headline",
    slug: "receipt",
  },
  compute: computeReceipt,
  shareabilityScore: computeReceiptShareability,
  Component: ReceiptCard,
};
