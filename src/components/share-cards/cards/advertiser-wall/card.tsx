import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader, NameList } from "../../_primitives";
import type { AdvertiserWallCardProps } from "./compute";

export function AdvertiserWallCard(props: AdvertiserWallCardProps) {
  return (
    <CardFrame>
      <CardHeader title="The Advertiser Wall" />

      <div
        style={{
          textAlign: "center",
          marginTop: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            fontFamily: "monospace",
            color: brand.danger,
            lineHeight: 1,
          }}
        >
          {props.uniqueAdvertisers.toLocaleString("en-US")}
        </div>
        <div
          style={{
            fontSize: 22,
            color: brand.foreground,
            marginTop: 12,
          }}
        >
          advertisers paid to reach you
        </div>
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            marginTop: 4,
          }}
        >
          using {props.targetingTypeCount} different targeting methods
        </div>
        {props.benchmarkLine && (
          <div
            style={{
              fontSize: 16,
              color: brand.accent,
              fontWeight: 600,
              marginTop: 8,
            }}
          >
            {props.benchmarkLine}
          </div>
        )}
      </div>

      {props.names.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <NameList names={props.names} columns={2} />
        </div>
      )}

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
