import { brand } from "@/lib/brand";
import {
  BigNumber,
  CardFooter,
  CardFrame,
  CardHeader,
  StatGrid,
} from "../../_primitives";
import type { XGuessesCardProps } from "./compute";

export function XGuessesCard(props: XGuessesCardProps) {
  const pct = Math.round(
    (props.unconfirmedCount / Math.max(1, props.totalInterests)) * 100,
  );

  return (
    <CardFrame>
      <CardHeader title="X's Guesses" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: 1,
          gap: 28,
        }}
      >
        {/* Big number: unconfirmed percentage */}
        <div style={{ marginTop: 8 }}>
          <BigNumber value={`${pct}%`} color={brand.danger} />
        </div>

        <div
          style={{
            fontSize: 24,
            color: brand.foreground,
            fontWeight: 600,
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          of your interests were guessed — not based on anything you posted
        </div>

        {/* Stats row */}
        <StatGrid
          stats={[
            {
              label: "Total interests",
              value: props.totalInterests.toLocaleString("en-US"),
            },
            {
              label: "Unconfirmed",
              value: props.unconfirmedCount.toLocaleString("en-US"),
            },
            {
              label: "Sold anyway",
              value: props.unconfirmedMonetized.toLocaleString("en-US"),
            },
          ]}
        />

        {/* Example interests — the specificity pump */}
        {props.examples.length > 0 && (
          <div
            style={{
              backgroundColor: brand.backgroundRaised,
              borderRadius: 16,
              padding: "20px 28px",
              width: "100%",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: brand.foregroundMuted,
                marginBottom: 12,
              }}
            >
              Guesses sold to advertisers
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {props.examples.map((name, i) => (
                <span
                  key={i}
                  style={{
                    backgroundColor: brand.background,
                    border: `1px solid ${brand.foregroundMuted}`,
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 16,
                    color: brand.foreground,
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Why this matters */}
        {props.unconfirmedMonetized > 0 && (
          <div
            style={{
              fontSize: 16,
              color: brand.foregroundMuted,
              textAlign: "center",
              lineHeight: 1.5,
              padding: "0 32px",
            }}
          >
            X invented interests for you, then sold ad slots against them.
          </div>
        )}
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
