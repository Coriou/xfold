import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { TopFindingCardProps } from "./compute";

const SEVERITY_COLOR: Record<string, string> = {
  critical: brand.danger,
  high: "#e67e22",
  medium: brand.foreground,
  info: brand.foregroundMuted,
};

export function TopFindingCard(props: TopFindingCardProps) {
  const color = SEVERITY_COLOR[props.severity] ?? brand.foreground;

  return (
    <CardFrame>
      <CardHeader title="#1 Finding" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: 24,
        }}
      >
        {/* Severity + category badge */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: color,
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: brand.foregroundMuted,
            }}
          >
            {props.category}
          </span>
        </div>

        {/* Hook — the shareable one-liner */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: brand.foreground,
            lineHeight: 1.25,
          }}
        >
          {props.hook}
        </div>

        {/* Detail */}
        <div
          style={{
            fontSize: 20,
            color: brand.foregroundMuted,
            lineHeight: 1.5,
          }}
        >
          {props.detail}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 24,
          }}
        >
          <div
            style={{
              backgroundColor: brand.backgroundRaised,
              borderRadius: 12,
              padding: "16px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                fontFamily: "monospace",
                color: brand.foreground,
              }}
            >
              {props.totalFindings}
            </div>
            <div
              style={{
                fontSize: 14,
                color: brand.foregroundMuted,
                marginTop: 4,
              }}
            >
              findings
            </div>
          </div>
          {props.criticalCount > 0 && (
            <div
              style={{
                backgroundColor: brand.backgroundRaised,
                borderRadius: 12,
                padding: "16px 24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: brand.danger,
                }}
              >
                {props.criticalCount}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: brand.foregroundMuted,
                  marginTop: 4,
                }}
              >
                critical
              </div>
            </div>
          )}
          {props.highCount > 0 && (
            <div
              style={{
                backgroundColor: brand.backgroundRaised,
                borderRadius: 12,
                padding: "16px 24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: "#e67e22",
                }}
              >
                {props.highCount}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: brand.foregroundMuted,
                  marginTop: 4,
                }}
              >
                high
              </div>
            </div>
          )}
        </div>

        {/* Punchline */}
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            marginTop: "auto",
            lineHeight: 1.5,
          }}
        >
          Discovered by cross-referencing your entire archive — insights X never
          shows you.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
