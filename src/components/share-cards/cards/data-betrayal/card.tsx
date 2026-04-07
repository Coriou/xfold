import { brand } from "@/lib/brand";
import {
  BigNumber,
  CardFooter,
  CardFrame,
  CardHeader,
  MetricRow,
} from "../../_primitives";
import type { DataBetrayalCardProps } from "./compute";

export function DataBetrayalCard(props: DataBetrayalCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Data Betrayal" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flex: 1,
          gap: 24,
        }}
      >
        {/* Dramatic retention duration */}
        <div style={{ marginTop: 12 }}>
          <BigNumber value={props.retentionLabel} color={brand.danger} />
        </div>

        <div
          style={{
            fontSize: 24,
            color: brand.foreground,
            fontWeight: 600,
            textAlign: "center",
            padding: "0 24px",
            lineHeight: 1.4,
          }}
        >
          X has kept your &ldquo;deleted&rdquo; tweets
        </div>

        {/* Context metrics */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: "100%",
          }}
        >
          <MetricRow
            label="Deleted tweets retained"
            value={props.deletedCount.toLocaleString("en-US")}
          />
          <MetricRow
            label="Deletion rate"
            value={`${props.deletionRate}%`}
            sub="of all tweets you ever wrote"
          />
          {props.fullyErasedCount > 0 && (
            <MetricRow
              label="Topics you wiped — still stored"
              value={props.fullyErasedCount.toLocaleString("en-US")}
            />
          )}
        </div>

        {/* Punch line */}
        <div
          style={{
            fontSize: 18,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            paddingBottom: 8,
            lineHeight: 1.5,
          }}
        >
          &ldquo;Delete&rdquo; on X means &ldquo;hide from everyone except
          X.&rdquo;
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
