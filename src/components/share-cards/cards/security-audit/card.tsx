import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader, StatGrid } from "../../_primitives";
import type { SecurityAuditCardProps } from "./compute";

export function SecurityAuditCard(props: SecurityAuditCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Security Audit" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 28,
        }}
      >
        {/* Hero anomaly count */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 100,
              fontWeight: 700,
              fontFamily: "monospace",
              color: props.criticalCount > 0 ? brand.danger : brand.foreground,
              lineHeight: 1,
            }}
          >
            {props.anomalyCount}
          </div>
          <div
            style={{
              fontSize: 24,
              color: brand.foreground,
              marginTop: 16,
              fontWeight: 600,
            }}
          >
            security anomalies detected
          </div>
        </div>

        {/* Top anomalies list */}
        {props.topAnomalies.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {props.topAnomalies.map((label, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: brand.backgroundRaised,
                  borderRadius: 10,
                  padding: "14px 20px",
                  fontSize: 18,
                  color: brand.foreground,
                }}
              >
                <span style={{ color: brand.danger, fontSize: 14 }}>⚠</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stats grid */}
        <StatGrid
          stats={[
            {
              label: "IP addresses",
              value: props.uniqueIps.toLocaleString("en-US"),
            },
            {
              label: "devices",
              value: props.deviceCount.toLocaleString("en-US"),
            },
            {
              label: "tweet clients",
              value: props.clientCount.toLocaleString("en-US"),
            },
          ]}
        />

        {/* Write access callout */}
        {props.writeAccessCount > 0 && (
          <div
            style={{
              fontSize: 16,
              color: brand.danger,
              textAlign: "center",
              fontWeight: 600,
            }}
          >
            {props.writeAccessCount} app
            {props.writeAccessCount === 1 ? "" : "s"} can still post on your
            behalf
          </div>
        )}

        {/* Punchline */}
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            lineHeight: 1.5,
          }}
        >
          Cross-referenced logins, devices, and tweet sources from your archive
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
