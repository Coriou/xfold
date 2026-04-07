import type { ShareCardModule } from "../../types";
import { AccuracyAuditCard } from "./card";
import {
  computeAccuracyAudit,
  computeAccuracyAuditShareability,
  type AccuracyAuditCardProps,
} from "./compute";

export const accuracyAuditCard: ShareCardModule<AccuracyAuditCardProps> = {
  meta: {
    id: "accuracy-audit",
    title: "Accuracy Audit",
    tagline: "How wrong is X's profile of you?",
    category: "identity",
    slug: "accuracy-audit",
  },
  compute: computeAccuracyAudit,
  shareabilityScore: computeAccuracyAuditShareability,
  Component: AccuracyAuditCard,
};
