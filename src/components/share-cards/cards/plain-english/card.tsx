import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { PlainEnglishCardProps } from "./compute";

const SEVERITY_COLORS: Record<string, string> = {
  critical: brand.danger,
  warning: "#e0a040",
  info: brand.foregroundMuted,
};

const SEVERITY_ICONS: Record<string, string> = {
  critical: "●",
  warning: "●",
  info: "○",
};

export function PlainEnglishCard(props: PlainEnglishCardProps) {
  return (
    <CardFrame>
      <CardHeader title="What X Knows" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: brand.foreground,
            marginBottom: 8,
          }}
        >
          What X knows about you, in plain English.
        </div>

        {/* Lines */}
        {props.lines.map((line, i) => {
          const color = SEVERITY_COLORS[line.severity] ?? brand.foregroundMuted;
          const icon = SEVERITY_ICONS[line.severity] ?? "○";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                lineHeight: 1.45,
              }}
            >
              <span
                style={{
                  color,
                  fontSize: 12,
                  marginTop: 6,
                  flexShrink: 0,
                }}
              >
                {icon}
              </span>
              <span
                style={{
                  fontSize: 19,
                  color: brand.foreground,
                }}
              >
                {line.text}
              </span>
            </div>
          );
        })}

        {/* Cross-reference note */}
        <div
          style={{
            fontSize: 14,
            color: brand.foregroundMuted,
            marginTop: "auto",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Cross-referenced from {props.sourcesUsed} data sources in your
          archive.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
