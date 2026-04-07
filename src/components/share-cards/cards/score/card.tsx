import { brand } from "@/lib/brand";
import {
  CardFooter,
  CardFrame,
  CardHeader,
  ScoreRingSvg,
} from "../../_primitives";
import type { ScoreCardProps } from "./compute";

export function ScoreCard(props: ScoreCardProps) {
  return (
    <CardFrame>
      <CardHeader />

      {/* Hero ring */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 24,
          marginBottom: 32,
        }}
      >
        <ScoreRingSvg score={props.overall} grade={props.grade} size={220} />
        <div
          style={{
            fontSize: 18,
            color: brand.foregroundMuted,
            marginTop: 16,
          }}
        >
          X Exposure Score
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: 26,
          lineHeight: 1.35,
          fontWeight: 600,
          color: brand.foreground,
          textAlign: "center",
          marginBottom: 28,
          padding: "0 24px",
        }}
      >
        {props.headline}
      </div>

      {/* Narrative bullets */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "0 16px",
        }}
      >
        {props.bullets.map((bullet, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              fontSize: 18,
              color: brand.foreground,
              lineHeight: 1.4,
            }}
          >
            <span
              style={{
                color: brand.accent,
                fontSize: 20,
                lineHeight: 1.2,
                fontWeight: 700,
              }}
            >
              ●
            </span>
            <span>{bullet}</span>
          </div>
        ))}
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
