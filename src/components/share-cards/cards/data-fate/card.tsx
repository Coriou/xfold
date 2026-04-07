import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { DataFateCardProps } from "./compute";

export function DataFateCard(props: DataFateCardProps) {
  return (
    <CardFrame>
      <CardHeader title="If You Left Today" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Big stat */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 100,
              fontWeight: 800,
              fontFamily: "monospace",
              color: brand.danger,
              lineHeight: 1,
            }}
          >
            {props.retainedPct}%
          </div>
          <div
            style={{
              fontSize: 20,
              color: brand.foreground,
              marginTop: 8,
              fontWeight: 600,
            }}
          >
            of your data categories survive account deletion
          </div>
        </div>

        {/* Retained items */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontFamily: "monospace",
              color: brand.danger,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            DATA THAT DOESN&apos;T LEAVE WITH YOU
          </div>

          {props.topRetained.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                backgroundColor: brand.backgroundRaised,
                borderRadius: 10,
                padding: "12px 16px",
                borderLeft: `3px solid ${brand.danger}`,
              }}
            >
              <span style={{ fontSize: 22 }}>{entry.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: brand.foreground,
                  }}
                >
                  {entry.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: brand.foregroundMuted,
                    marginTop: 2,
                  }}
                >
                  {entry.count.toLocaleString()} {entry.unit}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: brand.danger,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {entry.verdict}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom line */}
        <div
          style={{
            fontSize: 14,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            paddingTop: 16,
            lineHeight: 1.5,
          }}
        >
          &quot;Delete my account&quot; doesn&apos;t mean what you think it
          means.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
