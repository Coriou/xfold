import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { BenchmarkCardProps } from "./compute";

export function BenchmarkCard(props: BenchmarkCardProps) {
  return (
    <CardFrame>
      <CardHeader title="How You Compare" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 20,
        }}
      >
        {/* Hero callout */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div
            style={{
              fontSize: 24,
              color: brand.foreground,
              fontWeight: 600,
            }}
          >
            Above the typical X user in{" "}
            <span style={{ color: brand.danger }}>{props.totalConcerning}</span>{" "}
            {props.totalConcerning === 1 ? "category" : "categories"}
          </div>
        </div>

        {/* Benchmark rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {props.items.map((item, i) => (
            <div
              key={i}
              style={{
                backgroundColor: brand.backgroundRaised,
                borderRadius: 14,
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    fontSize: 18,
                    color: brand.foreground,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontSize: 14, color: brand.foregroundMuted }}>
                  Typical: {item.typical}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: brand.foreground,
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: brand.danger,
                    backgroundColor: brand.background,
                    borderRadius: 6,
                    padding: "2px 8px",
                  }}
                >
                  {item.multiplier}
                </div>
              </div>
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
          Compared against publicly reported averages for X users
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
