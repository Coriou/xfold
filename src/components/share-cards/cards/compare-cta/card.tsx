import { brand } from "@/lib/brand";
import {
  CardFooter,
  CardFrame,
  CardHeader,
  ScoreRingSvg,
} from "../../_primitives";
import type { CompareCTACardProps } from "./compute";

export function CompareCTACard(props: CompareCTACardProps) {
  return (
    <CardFrame>
      <CardHeader title="Your X Data" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        {/* Score ring */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ScoreRingSvg score={props.overall} grade={props.grade} size={180} />
          <div
            style={{
              fontSize: 20,
              color: brand.foregroundMuted,
              textAlign: "center",
              maxWidth: 600,
            }}
          >
            {props.headline}
          </div>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            width: "100%",
          }}
        >
          {props.topStats.map((stat, i) => (
            <div
              key={i}
              style={{
                backgroundColor: brand.backgroundRaised,
                borderRadius: 14,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: brand.foreground,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: brand.foregroundMuted,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: "auto",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: brand.accent,
            }}
          >
            How does yours compare?
          </div>
          <div
            style={{
              fontSize: 16,
              color: brand.foregroundMuted,
            }}
          >
            100% client-side — your data never leaves your browser
          </div>
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
