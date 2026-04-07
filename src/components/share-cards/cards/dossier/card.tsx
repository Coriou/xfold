import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { DossierCardProps, DossierInterest } from "./compute";

export function DossierCard(props: DossierCardProps) {
  return (
    <CardFrame>
      <CardHeader title="DOSSIER" />

      {/* Subject header — leaked-file aesthetic */}
      <div
        style={{
          padding: "16px 20px",
          backgroundColor: brand.backgroundRaised,
          borderRadius: 8,
          borderLeft: `4px solid ${brand.danger}`,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: brand.foregroundMuted,
            letterSpacing: 2,
            fontFamily: "monospace",
            marginBottom: 4,
          }}
        >
          SUBJECT
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: brand.foreground,
            fontFamily: "monospace",
          }}
        >
          @{props.username}
        </div>
        <div
          style={{
            fontSize: 14,
            color: brand.foregroundMuted,
            fontFamily: "monospace",
            marginTop: 2,
          }}
        >
          ID: {props.accountId}
        </div>
      </div>

      {/* Demographics row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: props.location ? "1fr 1fr 1fr" : "1fr 1fr",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <DossierField label="SEX" value={props.gender ?? "—"} />
        <DossierField label="AGE" value={props.ageRange ?? "—"} />
        {props.location && (
          <DossierField label="LOC" value={props.location} small />
        )}
      </div>

      {/* Languages */}
      {props.languages.length > 0 && (
        <DossierLine label="LANG" value={props.languages.join(" · ")} />
      )}

      {/* Interests */}
      <div style={{ marginTop: 18, marginBottom: 18 }}>
        <div
          style={{
            fontSize: 12,
            color: brand.foregroundMuted,
            letterSpacing: 2,
            fontFamily: "monospace",
            marginBottom: 8,
          }}
        >
          CATEGORIZED AS INTERESTED IN ({props.totalInterests} TOTAL)
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {props.interests.map((interest, i) => (
            <InterestChip key={i} interest={interest} />
          ))}
        </div>
      </div>

      {/* Shows */}
      {props.shows.length > 0 && (
        <DossierLine label="WATCHES" value={props.shows.join(" · ")} />
      )}

      {/* Audience lists footer */}
      {(props.numAudiences > 0 || props.numLookalikes > 0) && (
        <div
          style={{
            marginTop: 18,
            padding: "14px 18px",
            backgroundColor: "rgba(212, 83, 59, 0.1)",
            borderRadius: 8,
            fontSize: 16,
            color: brand.foreground,
            lineHeight: 1.5,
          }}
        >
          On{" "}
          <span
            style={{
              color: brand.danger,
              fontWeight: 700,
              fontFamily: "monospace",
            }}
          >
            {props.numAudiences.toLocaleString("en-US")}
          </span>{" "}
          advertiser audience lists,{" "}
          <span
            style={{
              color: brand.danger,
              fontWeight: 700,
              fontFamily: "monospace",
            }}
          >
            {props.numLookalikes.toLocaleString("en-US")}
          </span>{" "}
          lookalike pools
        </div>
      )}

      <CardFooter username={props.username} />
    </CardFrame>
  );
}

function DossierField({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: brand.backgroundRaised,
        borderRadius: 8,
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: brand.foregroundMuted,
          letterSpacing: 2,
          fontFamily: "monospace",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: small ? 18 : 28,
          fontWeight: 700,
          color: brand.foreground,
          fontFamily: "monospace",
          marginTop: 4,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DossierLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "baseline",
        padding: "10px 0",
        borderBottom: `1px solid ${brand.border}`,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: brand.foregroundMuted,
          letterSpacing: 2,
          fontFamily: "monospace",
          minWidth: 70,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 18,
          color: brand.foreground,
          flex: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function InterestChip({ interest }: { interest: DossierInterest }) {
  const isFlag = interest.noEvidence;
  return (
    <span
      style={{
        backgroundColor: isFlag ? "rgba(212, 83, 59, 0.15)" : brand.backgroundRaised,
        border: `1px solid ${isFlag ? brand.danger : brand.border}`,
        color: isFlag ? brand.danger : brand.foreground,
        borderRadius: 999,
        padding: "10px 18px",
        fontSize: 18,
        fontWeight: isFlag ? 600 : 500,
      }}
    >
      {interest.name}
      {isFlag ? " *" : ""}
    </span>
  );
}
