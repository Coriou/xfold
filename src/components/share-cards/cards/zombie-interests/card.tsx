import { brand } from "@/lib/brand";
import {
  CardFooter,
  CardFrame,
  CardHeader,
  MetricRow,
} from "../../_primitives";
import type { ZombieCardProps } from "./compute";

export function ZombieCard(props: ZombieCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Zombie Interest" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 24,
        }}
      >
        {/* The disabled interest — centerpiece */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div
            style={{
              fontSize: 16,
              color: brand.foregroundMuted,
              marginBottom: 8,
            }}
          >
            You turned off
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: brand.danger,
              lineHeight: 1.1,
            }}
          >
            &ldquo;{props.interestName}&rdquo;
          </div>
          <div
            style={{
              fontSize: 20,
              color: brand.danger,
              marginTop: 16,
              fontWeight: 600,
            }}
          >
            X kept selling it anyway
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MetricRow
            label="Ad impressions after you disabled it"
            value={props.adImpressions.toLocaleString("en-US")}
          />
          <MetricRow
            label="Advertisers who still used it"
            value={props.advertiserCount.toLocaleString("en-US")}
          />
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
              Still targeting this interest
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

        {/* Summary */}
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            lineHeight: 1.5,
            paddingBottom: 8,
          }}
        >
          {props.zombieCount} of {props.totalDisabled} disabled interests are
          still being monetized ·{" "}
          {props.totalZombieImpressions.toLocaleString("en-US")} total
          impressions
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
