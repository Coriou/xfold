import { brand } from "@/lib/brand";
import {
  BigNumber,
  CardFooter,
  CardFrame,
  CardHeader,
} from "../../_primitives";
import type { AccuracyAuditCardProps } from "./compute";

export function AccuracyAuditCard(props: AccuracyAuditCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Accuracy Audit" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Big unconfirmed percentage */}
        <BigNumber value={`${props.unconfirmedPercent}%`} color={brand.danger} />
        <div
          style={{
            fontSize: 24,
            color: brand.foreground,
            fontWeight: 600,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          of X&apos;s guesses have no evidence in my tweets
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 28,
            width: "100%",
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: brand.backgroundRaised,
              borderRadius: 12,
              padding: "16px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "monospace",
                color: brand.danger,
              }}
            >
              {props.unconfirmedCount}
            </div>
            <div style={{ fontSize: 14, color: brand.foregroundMuted }}>
              unconfirmed
            </div>
          </div>
          <div
            style={{
              flex: 1,
              backgroundColor: brand.backgroundRaised,
              borderRadius: 12,
              padding: "16px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "monospace",
                color: brand.accent,
              }}
            >
              {props.confirmedCount}
            </div>
            <div style={{ fontSize: 14, color: brand.foregroundMuted }}>
              confirmed
            </div>
          </div>
          {props.boughtCount > 0 && (
            <div
              style={{
                flex: 1,
                backgroundColor: brand.backgroundRaised,
                borderRadius: 12,
                padding: "16px 20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: brand.accentAmber,
                }}
              >
                {props.boughtCount}
              </div>
              <div style={{ fontSize: 14, color: brand.foregroundMuted }}>
                from brokers
              </div>
            </div>
          )}
        </div>

        {/* Unconfirmed examples */}
        {props.unconfirmedExamples.length > 0 && (
          <div
            style={{
              marginTop: 24,
              width: "100%",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontFamily: "monospace",
                color: brand.foregroundMuted,
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              X THINKS I&apos;M INTO:
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {props.unconfirmedExamples.map((name) => (
                <span
                  key={name}
                  style={{
                    backgroundColor: `${brand.danger}22`,
                    color: brand.danger,
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 16,
                  }}
                >
                  ❌ {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Confirmed examples for balance */}
        {props.confirmedExamples.length > 0 && (
          <div
            style={{
              marginTop: 16,
              width: "100%",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontFamily: "monospace",
                color: brand.foregroundMuted,
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              BUT GOT THESE RIGHT:
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {props.confirmedExamples.map((name) => (
                <span
                  key={name}
                  style={{
                    backgroundColor: `${brand.accent}22`,
                    color: brand.accent,
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 16,
                  }}
                >
                  ✅ {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <div
          style={{
            fontSize: 14,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            paddingTop: 12,
            lineHeight: 1.5,
          }}
        >
          Audited {props.totalAudited} interests against my actual tweets and
          likes.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
