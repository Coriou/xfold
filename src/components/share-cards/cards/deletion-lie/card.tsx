import { brand } from "@/lib/brand";
import {
  CardFooter,
  CardFrame,
  CardHeader,
  MetricRow,
} from "../../_primitives";
import type { DeletionLieCardProps } from "./compute";

export function DeletionLieCard(props: DeletionLieCardProps) {
  const fullyErased = props.activeMentions === 0;

  return (
    <CardFrame>
      <CardHeader title="The Deletion Lie" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 24,
        }}
      >
        {/* Topic — centerpiece */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div
            style={{
              fontSize: 16,
              color: brand.foregroundMuted,
              marginBottom: 8,
            }}
          >
            You deleted {fullyErased ? "every" : ""} tweet about
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: brand.accent,
              lineHeight: 1.1,
            }}
          >
            &ldquo;{props.topicName}&rdquo;
          </div>
          <div
            style={{
              fontSize: 22,
              color: brand.danger,
              marginTop: 16,
              fontWeight: 600,
            }}
          >
            X still profiles you for it
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MetricRow
            label="Deleted tweets mentioning this"
            value={props.deletedMentions.toLocaleString("en-US")}
          />
          <MetricRow
            label="Still in your public tweets"
            value={
              fullyErased
                ? "None — fully erased"
                : props.activeMentions.toLocaleString("en-US")
            }
            sub={fullyErased ? "but X remembers" : undefined}
          />
          {props.adImpressions > 0 && (
            <MetricRow
              label="Ad impressions from this topic"
              value={props.adImpressions.toLocaleString("en-US")}
              sub="still being monetized"
            />
          )}
        </div>

        {/* Punchline */}
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            lineHeight: 1.5,
            padding: "0 32px",
          }}
        >
          {props.survivingTopicCount} deleted topics survive in your profile
          {props.fullyErasedButProfiled > 0 && (
            <span>
              {" "}
              · {props.fullyErasedButProfiled} exist only in tweets you deleted
            </span>
          )}
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
