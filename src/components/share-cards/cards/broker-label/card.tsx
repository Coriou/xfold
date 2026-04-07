import { brand } from "@/lib/brand";
import {
  CardFooter,
  CardFrame,
  CardHeader,
  MetricRow,
} from "../../_primitives";
import type { BrokerCardProps } from "./compute";

export function BrokerCard(props: BrokerCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Data Broker Label" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 24,
        }}
      >
        {/* The label — centerpiece */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div
            style={{
              fontSize: 16,
              color: brand.foregroundMuted,
              marginBottom: 8,
            }}
          >
            A data broker told X you are
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: brand.accent,
              lineHeight: 1.15,
              padding: "0 20px",
            }}
          >
            &ldquo;{props.label}&rdquo;
          </div>
          <div
            style={{
              fontSize: 20,
              color: props.confirmed ? brand.foregroundMuted : brand.danger,
              marginTop: 16,
              fontWeight: 600,
            }}
          >
            {props.confirmed
              ? "Confirmed from your behavior"
              : "No evidence in your tweets or likes"}
          </div>
        </div>

        {/* Flow */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MetricRow
            label="Source"
            value="Third-party data broker"
            sub="you have no relationship with"
          />
          {props.adImpressions > 0 && (
            <MetricRow
              label="Ad impressions from this label"
              value={props.adImpressions.toLocaleString("en-US")}
            />
          )}
          {props.linkedToConversion && (
            <MetricRow
              label="Off-platform conversion"
              value="Yes"
              sub="tracked beyond X"
            />
          )}
        </div>

        {/* Summary */}
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            lineHeight: 1.5,
            padding: "0 32px",
          }}
        >
          {props.totalLabels} broker labels attached to your profile ·{" "}
          {props.unconfirmedCount} have no behavioral basis
          {props.unconfirmedButTargeted > 0 && (
            <span>
              {" "}
              · {props.unconfirmedButTargeted} were used by advertisers anyway
            </span>
          )}
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
