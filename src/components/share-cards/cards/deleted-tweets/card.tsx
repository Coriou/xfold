import { brand } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import {
  BigNumber,
  CardFooter,
  CardFrame,
  CardHeader,
} from "../../_primitives";
import type { DeletedTweetsCardProps } from "./compute";

export function DeletedTweetsCard(props: DeletedTweetsCardProps) {
  return (
    <CardFrame>
      <CardHeader title="The Deleted" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <BigNumber
          value={props.deletedCount.toLocaleString("en-US")}
          color={brand.danger}
        />
        <div
          style={{
            fontSize: 28,
            color: brand.foreground,
            marginTop: 24,
            fontWeight: 600,
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          tweets you deleted — that X still kept
        </div>
        <div
          style={{
            fontSize: 20,
            color: brand.foregroundMuted,
            marginTop: 20,
            textAlign: "center",
            padding: "0 32px",
            lineHeight: 1.5,
          }}
        >
          {props.percentOfTotal}% of all tweets you ever wrote are ones you
          thought were gone.
        </div>
        {props.oldestDeletedDate && (
          <div
            style={{
              fontSize: 16,
              color: brand.foregroundMuted,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            The oldest dates back to {formatDate(props.oldestDeletedDate)}.
          </div>
        )}
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
