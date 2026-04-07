import { brand } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import {
  CardFooter,
  CardFrame,
  CardHeader,
  ScoreRingSvg,
} from "../../_primitives";
import type {
  ScoreCardProps,
  ScoreCardQuote,
  ScoreCardReceipt,
} from "./compute";

export function ScoreCard(props: ScoreCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Your X Receipt" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 12,
        }}
      >
        {/* Compact score ring + grade */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 4,
          }}
        >
          <ScoreRingSvg score={props.overall} grade={props.grade} size={120} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.35,
                fontWeight: 600,
                color: brand.foreground,
              }}
            >
              {props.headline}
            </div>
            <div
              style={{
                fontSize: 14,
                color: brand.foregroundMuted,
                marginTop: 4,
              }}
            >
              X Exposure Score
            </div>
          </div>
        </div>

        {/* Receipt lines — the core of the card */}
        {props.receipts.length > 0 && (
          <ReceiptStack receipts={props.receipts} />
        )}

        {/* Quote receipt (if available and space permits) */}
        {props.quote && props.receipts.length < 3 && (
          <QuoteReceipt quote={props.quote} />
        )}

        {/* Fallback bullets when neither receipts nor quote */}
        {props.receipts.length === 0 && !props.quote && (
          <BulletList bullets={props.bullets} />
        )}
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}

function ReceiptStack({ receipts }: { receipts: readonly ScoreCardReceipt[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {receipts.map((r, i) => {
        const color =
          r.severity === "high"
            ? brand.danger
            : r.severity === "medium"
              ? brand.foreground
              : brand.foregroundMuted;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 20px",
              backgroundColor: brand.backgroundRaised,
              borderRadius: 10,
              borderLeft: `3px solid ${color}`,
            }}
          >
            <span style={{ fontSize: 22 }}>{r.icon}</span>
            <span
              style={{
                fontSize: 17,
                color: brand.foreground,
                lineHeight: 1.35,
                fontWeight: 500,
              }}
            >
              {r.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function QuoteReceipt({ quote }: { quote: ScoreCardQuote }) {
  const isHigh = quote.severity === "high";
  return (
    <div
      style={{
        margin: "8px 0 0",
        padding: "16px 20px",
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
          marginBottom: 6,
        }}
      >
        EVIDENCE
      </div>
      <div
        style={{
          fontSize: 20,
          color: brand.foreground,
          lineHeight: 1.4,
          fontWeight: 600,
        }}
      >
        &ldquo;{quote.text}&rdquo;
      </div>
      <div
        style={{
          fontSize: 13,
          color: brand.foregroundMuted,
          marginTop: 8,
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
