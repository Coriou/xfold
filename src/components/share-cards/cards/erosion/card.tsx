import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { ErosionCardProps } from "./compute";

export function ErosionCard(props: ErosionCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Privacy Erosion" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 20,
        }}
      >
        {/* Headline stats */}
        <div
          style={{
            display: "flex",
            gap: 32,
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                fontFamily: "monospace",
                color: brand.danger,
                lineHeight: 1,
              }}
            >
              {props.totalCategories}
            </div>
            <div
              style={{
                fontSize: 16,
                color: brand.foregroundMuted,
                marginTop: 8,
              }}
            >
              data categories
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                fontFamily: "monospace",
                color: brand.foreground,
                lineHeight: 1,
              }}
            >
              {props.spanYears}
            </div>
            <div
              style={{
                fontSize: 16,
                color: brand.foregroundMuted,
                marginTop: 8,
              }}
            >
              years of data
            </div>
          </div>
        </div>

        {/* Worst year callout */}
        {props.worstYear && (
          <div
            style={{
              textAlign: "center",
              fontSize: 20,
              color: brand.danger,
              fontWeight: 600,
            }}
          >
            {props.worstYear}: {props.worstYearCount} new tracking categories
            added
          </div>
        )}

        {/* Recent layers — what was added most recently */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: brand.foregroundMuted,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            Most recently added
          </div>
          {props.recentLayers.map((layer, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: brand.backgroundRaised,
                borderRadius: 10,
                padding: "12px 20px",
              }}
            >
              <span style={{ fontSize: 18, color: brand.foreground }}>
                {layer.label}
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontFamily: "monospace",
                  color: brand.foregroundMuted,
                }}
              >
                {layer.year}
              </span>
            </div>
          ))}
        </div>

        {/* Punchline */}
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            lineHeight: 1.5,
          }}
        >
          Each year X finds new ways to track you. This is the net tightening.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
