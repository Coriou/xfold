import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { ConfessionCardProps } from "./compute";

export function ConfessionCard(props: ConfessionCardProps) {
  return (
    <CardFrame>
      <CardHeader title="The Receipts" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          gap: 32,
        }}
      >
        {/* Tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 28 }}>{props.icon}</span>
          <span
            style={{
              fontSize: 13,
              fontFamily: "monospace",
              color: brand.danger,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {props.tag}
          </span>
        </div>

        {/* Claim */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: brand.foreground,
            lineHeight: 1.25,
            maxWidth: 800,
          }}
        >
          {props.claim}
        </div>

        {/* Proof box */}
        <div
          style={{
            backgroundColor: brand.backgroundRaised,
            borderRadius: 16,
            padding: "28px 32px",
            borderLeft: `5px solid ${brand.danger}`,
            width: "100%",
            maxWidth: 820,
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: brand.danger,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            PROOF
          </div>
          <div
            style={{
              fontSize: 20,
              color: brand.foreground,
              lineHeight: 1.5,
              fontStyle: props.proof.includes('"') ? "normal" : "italic",
            }}
          >
            {props.proof}
          </div>
          {props.proofDate && (
            <div
              style={{
                fontSize: 13,
                color: brand.foregroundMuted,
                marginTop: 8,
              }}
            >
              {props.proofDate}
            </div>
          )}
        </div>

        {/* Punchline */}
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            lineHeight: 1.5,
            maxWidth: 700,
          }}
        >
          {props.punchline}
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
