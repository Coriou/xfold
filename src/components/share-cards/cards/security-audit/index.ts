import type { ShareCardModule } from "../../types";
import { SecurityAuditCard } from "./card";
import {
  computeSecurityAuditCard,
  computeSecurityAuditShareability,
  type SecurityAuditCardProps,
} from "./compute";

export const securityAuditCard: ShareCardModule<SecurityAuditCardProps> = {
  meta: {
    id: "security-audit",
    title: "Security Audit",
    tagline: "Anomalies lurking in your login and device history",
    category: "headline",
    slug: "security-audit",
  },
  compute: computeSecurityAuditCard,
  shareabilityScore: computeSecurityAuditShareability,
  Component: SecurityAuditCard,
};
