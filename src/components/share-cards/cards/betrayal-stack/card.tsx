import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { BetrayalStackCardProps } from "./compute";

export function BetrayalStackCard(props: BetrayalStackCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Broken Promises" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: brand.foreground,
            marginBottom: 28,
          }}
        >
          {props.betrayalCount} time{props.betrayalCount === 1 ? "" : "s"} X
          broke its promise to you.
        </div>

        {/* Betrayal entries */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            flex: 1,
          }}
        >
          {props.betrayals.map((b, i) => (
            <div
              key={i}
              style={{
                backgroundColor: brand.backgroundRaised,
                borderRadius: 14,
                padding: "20px 22px",
                borderLeft: `4px solid ${brand.danger}`,
              }}
            >
              {/* Betrayal label */}
              <div
                style={{
                  fontSize: 14,
                  fontFamily: "monospace",
                  color: brand.danger,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                {b.label}
              </div>

              {/* You did / X did */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 17, color: brand.foreground }}>
                  <span style={{ color: brand.accent }}>You: </span>
                  {b.userAction}
                </div>
                <div style={{ fontSize: 17, color: brand.foreground }}>
                  <span style={{ color: brand.danger }}>X: </span>
                  {b.xAction}
                </div>
              </div>

              {/* Evidence */}
              <div
                style={{
                  fontSize: 14,
                  color: brand.foregroundMuted,
                  marginTop: 8,
                  lineHeight: 1.4,
                }}
              >
                {b.evidence}
              </div>
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
            paddingTop: 12,
          }}
        >
          Privacy controls exist. X just doesn&apos;t honor them.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
