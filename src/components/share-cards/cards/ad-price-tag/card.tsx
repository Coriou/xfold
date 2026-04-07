import { brand } from "@/lib/brand";
import {
  CardFooter,
  CardFrame,
  CardHeader,
  MetricRow,
} from "../../_primitives";
import type { AdPriceTagCardProps } from "./compute";

export function AdPriceTagCard(props: AdPriceTagCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Your Ad Price Tag" />

      {/* Hero dollar amount */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 36,
          marginTop: 20,
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          X earned from your attention
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            fontFamily: "monospace",
            color: brand.accent,
            lineHeight: 1,
            letterSpacing: -3,
          }}
        >
          {props.totalRevenue}
        </div>
        <div
          style={{
            fontSize: 18,
            color: brand.foregroundMuted,
            marginTop: 16,
          }}
        >
          from {props.totalImpressions.toLocaleString()} ads by{" "}
          {props.uniqueAdvertisers} companies
        </div>
      </div>

      {/* Key metrics */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {props.biggestSpender && (
          <MetricRow
            label="Biggest spender"
            value={props.biggestSpender}
            sub={props.biggestSpenderAmount ?? undefined}
          />
        )}
        {props.mostExpensiveMethod && (
          <MetricRow
            label="Most expensive signal"
            value={props.mostExpensiveMethod}
          />
        )}
        {props.breakdown.length > 0 && props.breakdown[0] && (
          <MetricRow
            label="Main revenue driver"
            value={props.breakdown[0].label}
            sub={`${props.breakdown[0].pct}% of your value`}
          />
        )}
      </div>

      {/* Bottom tagline */}
      <div
        style={{
          marginTop: "auto",
          fontSize: 16,
          color: brand.foregroundMuted,
          fontStyle: "italic",
          paddingTop: 24,
        }}
      >
        You are the product. This is the receipt.
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
