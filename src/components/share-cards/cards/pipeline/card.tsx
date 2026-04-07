import { brand } from "@/lib/brand";
import {
  CardFooter,
  CardFrame,
  CardHeader,
  MetricRow,
} from "../../_primitives";
import type { PipelineCardProps } from "./compute";

export function PipelineCard(props: PipelineCardProps) {
  const statusLabel = props.confirmedByBehavior
    ? "Confirmed from your tweets"
    : "You never tweeted about this";

  const statusColor = props.confirmedByBehavior
    ? brand.foregroundMuted
    : brand.danger;

  return (
    <CardFrame>
      <CardHeader title="The Pipeline" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 24,
        }}
      >
        {/* Interest name — the centerpiece */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div
            style={{
              fontSize: 16,
              color: brand.foregroundMuted,
              marginBottom: 8,
            }}
          >
            X decided you like
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: brand.accent,
              lineHeight: 1.1,
            }}
          >
            &ldquo;{props.interestName}&rdquo;
          </div>
          <div
            style={{
              fontSize: 18,
              color: statusColor,
              marginTop: 12,
              fontWeight: 600,
            }}
          >
            {statusLabel}
          </div>
        </div>

        {/* Flow: interest → advertisers → impressions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MetricRow
            label="Advertisers who bought this"
            value={props.advertiserCount.toLocaleString("en-US")}
          />
          <MetricRow
            label="Ad impressions from this interest"
            value={props.adImpressions.toLocaleString("en-US")}
          />
          {props.hasConversion && (
            <MetricRow
              label="Off-platform conversion"
              value="Yes"
              sub="tracked beyond X"
            />
          )}
        </div>

        {/* Top advertisers */}
        {props.topAdvertisers.length > 0 && (
          <div
            style={{
              backgroundColor: brand.backgroundRaised,
              borderRadius: 12,
              padding: "16px 24px",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: brand.foregroundMuted,
                marginBottom: 8,
              }}
            >
              Top buyers
            </div>
            <div
              style={{
                fontSize: 18,
                color: brand.foreground,
                lineHeight: 1.6,
              }}
            >
              {props.topAdvertisers.join("  ·  ")}
            </div>
          </div>
        )}

        {/* Summary line */}
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            paddingBottom: 8,
          }}
        >
          {props.totalUnconfirmed} unconfirmed guesses · {props.totalMonetized}{" "}
          interests monetized
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
