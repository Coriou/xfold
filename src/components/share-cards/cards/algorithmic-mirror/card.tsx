import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { AlgorithmicMirrorCardProps } from "./compute";

export function AlgorithmicMirrorCard(props: AlgorithmicMirrorCardProps) {
  return (
    <CardFrame>
      <CardHeader title="X Thinks You Are…" />

      {/* Bio section */}
      <div
        style={{
          backgroundColor: brand.backgroundRaised,
          borderRadius: 20,
          padding: "32px 28px",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            fontSize: 26,
            lineHeight: 1.5,
            color: brand.foreground,
            fontWeight: 500,
          }}
        >
          {props.bio}
        </div>
      </div>

      {/* Identity pills */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 28,
        }}
      >
        {props.gender && <ProfilePill label={capitalize(props.gender)} />}
        {props.ageRange && <ProfilePill label={props.ageRange} />}
        {props.location && <ProfilePill label={props.location} />}
        {props.topLookalike && (
          <ProfilePill label={`Looks like a ${props.topLookalike} fan`} />
        )}
      </div>

      {/* Interests grid */}
      {props.topInterests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 14,
              color: brand.foregroundMuted,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              fontWeight: 700,
            }}
          >
            interests ({props.totalInterests} total)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {props.topInterests.map((interest) => (
              <span
                key={interest}
                style={{
                  backgroundColor: `${brand.accent}22`,
                  color: brand.accent,
                  borderRadius: 20,
                  padding: "8px 16px",
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                {interest}
              </span>
            ))}
            {props.totalInterests > props.topInterests.length && (
              <span
                style={{
                  backgroundColor: brand.backgroundRaised,
                  color: brand.foregroundMuted,
                  borderRadius: 20,
                  padding: "8px 16px",
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                +{props.totalInterests - props.topInterests.length} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Shows */}
      {props.topShows.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 14,
              color: brand.foregroundMuted,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              fontWeight: 700,
            }}
          >
            watches
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {props.topShows.map((show) => (
              <span
                key={show}
                style={{
                  backgroundColor: brand.backgroundRaised,
                  color: brand.foreground,
                  borderRadius: 20,
                  padding: "8px 16px",
                  fontSize: 18,
                }}
              >
                {show}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Absurdity punchline */}
      {props.absurdity && (
        <div
          style={{
            fontSize: 16,
            color: brand.danger,
            fontStyle: "italic",
            marginTop: "auto",
            marginBottom: 8,
            lineHeight: 1.4,
          }}
        >
          {props.absurdity}
        </div>
      )}

      {/* Profile age */}
      {props.profileYears > 0 && (
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            marginBottom: 8,
          }}
        >
          Built over {props.profileYears}{" "}
          {props.profileYears === 1 ? "year" : "years"} of surveillance.
        </div>
      )}

      <CardFooter username={props.username} />
    </CardFrame>
  );
}

function ProfilePill({ label }: { label: string }) {
  return (
    <span
      style={{
        backgroundColor: brand.backgroundRaised,
        color: brand.foreground,
        borderRadius: 12,
        padding: "10px 18px",
        fontSize: 20,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
