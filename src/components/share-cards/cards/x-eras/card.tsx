import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { XErasCardProps } from "./compute";

/** Cycle through era accent colors for visual variety. */
const ERA_COLORS = [
  brand.accent,
  brand.accentAmber,
  brand.danger,
  brand.accentBlue,
  brand.accentPurple,
] as const;

export function XErasCard(props: XErasCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Your X Eras" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: brand.foreground,
            }}
          >
            {props.totalYears} years on X, told in chapters.
          </div>
        </div>

        {/* Era list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            flex: 1,
          }}
        >
          {props.eras.map((era, i) => {
            const color = ERA_COLORS[i % ERA_COLORS.length] ?? brand.accent;
            return (
              <div
                key={i}
                style={{
                  backgroundColor: brand.backgroundRaised,
                  borderRadius: 12,
                  padding: "16px 20px",
                  borderLeft: `4px solid ${color}`,
                }}
              >
                {/* Era header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontFamily: "monospace",
                      color: brand.foregroundMuted,
                    }}
                  >
                    {era.label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: brand.foregroundMuted,
                    }}
                  >
                    {era.tweetsPerDay}/day · {era.primaryClient}
                  </span>
                </div>
                {/* Era name */}
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color,
                    marginBottom: 4,
                  }}
                >
                  {era.name}
                </div>
                {/* Era description */}
                <div
                  style={{
                    fontSize: 15,
                    color: brand.foregroundMuted,
                    lineHeight: 1.35,
                  }}
                >
                  {era.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
