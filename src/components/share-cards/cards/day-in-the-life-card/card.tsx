import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { DayInTheLifeCardProps } from "./compute";

export function DayInTheLifeCard(props: DayInTheLifeCardProps) {
  return (
    <CardFrame>
      <CardHeader title="A Day In The Life" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Hero */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              fontFamily: "monospace",
              color: brand.danger,
              lineHeight: 1,
            }}
          >
            {props.totalEvents}
          </div>
          <div
            style={{
              fontSize: 18,
              color: brand.foregroundMuted,
              marginTop: 8,
            }}
          >
            events X recorded on {props.dateFormatted}
          </div>
          <div
            style={{
              fontSize: 14,
              color: brand.foregroundMuted,
              marginTop: 4,
            }}
          >
            From {props.activeSources} data sources · Peak at {props.peakHour}
          </div>
        </div>

        {/* Mini timeline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {props.highlights.map((h, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                backgroundColor: brand.backgroundRaised,
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  width: 52,
                  fontSize: 13,
                  fontFamily: "monospace",
                  color: brand.foregroundMuted,
                  flexShrink: 0,
                }}
              >
                {h.time}
              </span>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{h.emoji}</span>
              <span
                style={{
                  fontSize: 15,
                  color: brand.foreground,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {h.text}
              </span>
            </div>
          ))}
        </div>

        {/* Breakdown */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: "auto",
          }}
        >
          {props.breakdown.map((b, i) => (
            <div
              key={i}
              style={{
                backgroundColor: brand.backgroundRaised,
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: brand.foreground,
                }}
              >
                {b.count}
              </span>
              <span style={{ color: brand.foregroundMuted, marginLeft: 6 }}>
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
