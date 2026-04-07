import { brand } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import {
  CardFooter,
  CardFrame,
  CardHeader,
  ScoreRingSvg,
} from "../../_primitives";
import type { ScoreCardProps, ScoreCardQuote } from "./compute";

export function ScoreCard(props: ScoreCardProps) {
  return (
    <CardFrame>
      <CardHeader />

      {/* Hero ring */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 16,
          marginBottom: 24,
        }}
      >
        <ScoreRingSvg score={props.overall} grade={props.grade} size={200} />
        <div
          style={{
            fontSize: 18,
            color: brand.foregroundMuted,
            marginTop: 14,
          }}
        >
          X Exposure Score
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: 22,
          lineHeight: 1.35,
          fontWeight: 600,
          color: brand.foreground,
          textAlign: "center",
          marginBottom: 24,
          padding: "0 24px",
        }}
      >
        {props.headline}
      </div>

      {/* Quote receipt OR fallback bullets */}
      {props.quote ? (
        <ReceiptBlock quote={props.quote} />
      ) : (
        <BulletList bullets={props.bullets} />
      )}

      <CardFooter username={props.username} />
    </CardFrame>
  );
}

function ReceiptBlock({ quote }: { quote: ScoreCardQuote }) {
  const isHigh = quote.severity === "high";
  return (
    <div
      style={{
        margin: "0 8px",
        padding: "20px 24px",
        backgroundColor: brand.backgroundRaised,
        borderRadius: 12,
        borderLeft: `4px solid ${isHigh ? brand.danger : brand.accent}`,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: brand.foregroundMuted,
          letterSpacing: 2,
          fontFamily: "monospace",
          marginBottom: 8,
        }}
      >
        EVIDENCE
      </div>
      <div
        style={{
          fontSize: 24,
          color: brand.foreground,
          lineHeight: 1.4,
          fontWeight: 600,
        }}
      >
        &ldquo;{quote.text}&rdquo;
      </div>
      <div
        style={{
          fontSize: 14,
          color: brand.foregroundMuted,
          marginTop: 12,
          lineHeight: 1.4,
        }}
      >
        {quote.contextLine}
        {quote.date ? ` · ${formatDate(quote.date)}` : ""}
      </div>
    </div>
  );
}

function BulletList({ bullets }: { bullets: readonly string[] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "0 16px",
      }}
    >
      {bullets.map((bullet, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            fontSize: 18,
            color: brand.foreground,
            lineHeight: 1.4,
          }}
        >
          <span
            style={{
              color: brand.accent,
              fontSize: 20,
              lineHeight: 1.2,
              fontWeight: 700,
            }}
          >
            ●
          </span>
          <span>{bullet}</span>
        </div>
      ))}
    </div>
  );
}
