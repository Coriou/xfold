import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { XVsRealityCardProps } from "./compute";

export function XVsRealityCard(props: XVsRealityCardProps) {
  return (
    <CardFrame>
      <CardHeader title="X's Version vs. Reality" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Headline */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: brand.foreground,
            marginBottom: 24,
          }}
        >
          {props.criticalCount} things X&apos;s archive viewer hides from you.
        </div>

        {/* Comparison rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            flex: 1,
          }}
        >
          {props.rows.map((row, i) => (
            <div
              key={i}
              style={{
                backgroundColor: brand.backgroundRaised,
                borderRadius: 14,
                padding: "16px 20px",
                borderLeft: `4px solid ${row.severity === "critical" ? brand.danger : brand.accent}`,
              }}
            >
              {/* Category */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: brand.foregroundMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 10,
                }}
              >
                {row.category}
              </div>

              {/* Side by side */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: brand.foregroundMuted,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    X shows you
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: brand.foregroundMuted,
                      lineHeight: 1.3,
                    }}
                  >
                    {row.xVersion}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: brand.danger,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    Reality
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: brand.foreground,
                      lineHeight: 1.3,
                    }}
                  >
                    {row.reality}
                  </div>
                </div>
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
          The viewer is the product demo. The archive is the full picture.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
