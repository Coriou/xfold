import { buildSecurityAudit } from "@/lib/archive/insights/security-audit";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface SecurityAuditCardProps {
  readonly username: string;
  /** Total anomalies found. */
  readonly anomalyCount: number;
  /** Critical anomaly count. */
  readonly criticalCount: number;
  /** Top 3 anomaly labels. */
  readonly topAnomalies: readonly string[];
  /** Unique IPs used. */
  readonly uniqueIps: number;
  /** Unique devices. */
  readonly deviceCount: number;
  /** Tweet clients used. */
  readonly clientCount: number;
  /** Apps with write access. */
  readonly writeAccessCount: number;
}

export function computeSecurityAuditCard(
  ctx: ComputeContext,
): SecurityAuditCardProps | null {
  const audit = buildSecurityAudit(ctx.archive);
  if (!audit) return null;
  if (audit.anomalies.length === 0 && audit.uniqueIps < 2) return null;

  return {
    username: ctx.archive.meta.username,
    anomalyCount: audit.anomalies.length,
    criticalCount: audit.anomalies.filter((a) => a.severity === "critical")
      .length,
    topAnomalies: audit.anomalies.slice(0, 3).map((a) => a.label),
    uniqueIps: audit.uniqueIps,
    deviceCount: audit.deviceCount,
    clientCount: audit.clientCount,
    writeAccessCount: audit.writeAccessApps.length,
  };
}

export function computeSecurityAuditShareability(
  props: SecurityAuditCardProps,
): ShareabilityScore {
  const criticalBonus = props.criticalCount * 20;

  return {
    magnitude: Math.min(100, props.anomalyCount * 15 + criticalBonus),
    specificity: Math.min(100, 50 + props.topAnomalies.length * 15),
    uniqueness: 85, // Security audits from archive data are very uncommon
  };
}
