import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { ProspectusCardProps } from "./compute";

export function ProspectusCard(props: ProspectusCardProps) {
  return (
    <CardFrame>
      <CardHeader title="X's Sales Pitch" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 20,
        }}
      >
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div
            style={{
              fontSize: 18,
              color: brand.foregroundMuted,
              marginBottom: 4,
            }}
          >
            This is what X tells{" "}
            {props.totalAdvertisers.toLocaleString("en-US")} advertisers about
            you
          </div>
        </div>

        {/* Demographics — the product listing */}
        {props.demographics.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: brand.foregroundMuted,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                fontWeight: 600,
              }}
            >
              Hidden Demographics
            </div>
            {props.demographics.map((d) => (
              <div
                key={d.category}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: brand.backgroundRaised,
                  borderRadius: 10,
                  padding: "14px 20px",
                }}
              >
                <span style={{ fontSize: 16, color: brand.foregroundMuted }}>
                  {d.category}
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: brand.foreground,
                  }}
                >
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Audience memberships */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {props.customAudiences > 0 && (
            <AudienceStat
              label="Custom Audiences"
              value={props.customAudiences}
            />
          )}
          {props.lookalikes > 0 && (
            <AudienceStat label="Lookalike Lists" value={props.lookalikes} />
          )}
          {props.brokerLabels > 0 && (
            <AudienceStat label="Broker Labels" value={props.brokerLabels} />
          )}
          {props.conversions > 0 && (
            <AudienceStat label="Conversion Events" value={props.conversions} />
          )}
        </div>

        {/* Top targeted interests */}
        {props.topInterests.length > 0 && (
          <div
            style={{
              backgroundColor: brand.backgroundRaised,
              borderRadius: 12,
              padding: "14px 20px",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: brand.foregroundMuted,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Most Targeted Interests
            </div>
            <div
              style={{
                fontSize: 16,
                color: brand.foreground,
                lineHeight: 1.6,
              }}
            >
              {props.topInterests.join("  ·  ")}
            </div>
          </div>
        )}

        {/* Punchline */}
        <div
          style={{
            fontSize: 15,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            lineHeight: 1.5,
          }}
        >
          {props.dataPointCount} categories of your data shared with advertisers
          — you never consented to most of them.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}

function AudienceStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        backgroundColor: brand.backgroundRaised,
        borderRadius: 12,
        padding: "16px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          fontFamily: "monospace",
          color: brand.foreground,
          marginBottom: 4,
        }}
      >
        {value.toLocaleString("en-US")}
      </div>
      <div style={{ fontSize: 13, color: brand.foregroundMuted }}>{label}</div>
    </div>
  );
}
