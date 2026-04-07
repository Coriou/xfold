import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { SurveillanceTimelineCardProps } from "./compute";

export function SurveillanceTimelineCard(props: SurveillanceTimelineCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Surveillance Timeline" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header line — dossier aesthetic */}
        <div
          style={{
            fontSize: 14,
            fontFamily: "monospace",
            color: brand.foregroundMuted,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          SURVEILLANCE PERIOD: {props.durationLabel}
        </div>

        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: brand.foreground,
            marginBottom: 28,
          }}
        >
          When X started watching.
        </div>

        {/* Timeline entries */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: 1,
          }}
        >
          {props.milestones.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "10px 16px",
                backgroundColor:
                  i === 0 ? brand.backgroundRaised : "transparent",
                borderRadius: 10,
              }}
            >
              {/* Date */}
              <span
                style={{
                  fontSize: 14,
                  fontFamily: "monospace",
                  color: brand.foregroundMuted,
                  width: 120,
                  flexShrink: 0,
                }}
              >
                {m.dateLabel}
              </span>

              {/* Connector dot */}
              <span
                style={{
                  color: i === 0 ? brand.danger : brand.accent,
                  fontSize: 10,
                  flexShrink: 0,
                }}
              >
                ●
              </span>

              {/* Icon + label */}
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span
                style={{
                  fontSize: 17,
                  color: brand.foreground,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>

        {/* Punchline */}
        <div
          style={{
            fontSize: 15,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            paddingTop: 16,
            lineHeight: 1.5,
          }}
        >
          Each milestone marks the start of a new type of data collection.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
