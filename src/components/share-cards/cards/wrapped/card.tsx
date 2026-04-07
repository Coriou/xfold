import { brand } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import {
  BigNumber,
  CardFooter,
  CardFrame,
  CardHeader,
  MetricRow,
  QuoteBlock,
} from "../../_primitives";
import type { WrappedCardProps } from "./compute";

export function WrappedCard(props: WrappedCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Your X, Wrapped" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 16,
          marginBottom: 28,
        }}
      >
        <BigNumber value={props.daysOnX.toLocaleString("en-US")} unit="days on X" />
        <div
          style={{
            fontSize: 18,
            color: brand.foregroundMuted,
            marginTop: 4,
          }}
        >
          {props.tweetCount.toLocaleString("en-US")} tweets ·{" "}
          {props.likeCount.toLocaleString("en-US")} likes
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {props.topHashtag && (
          <MetricRow
            label="Most-used hashtag"
            value={`#${props.topHashtag.tag}`}
            sub={`${props.topHashtag.count} times`}
          />
        )}
        {props.topHourLabel && (
          <MetricRow label="You tweet most at" value={props.topHourLabel} />
        )}
        {props.topContactScreenName && (
          <MetricRow
            label="Talked to most"
            value={`@${props.topContactScreenName}`}
          />
        )}
      </div>

      {props.firstTweetText && (
        <div style={{ marginTop: 24 }}>
          <QuoteBlock
            caption="Your first tweet"
            text={props.firstTweetText}
            date={
              props.firstTweetDate ? formatDate(props.firstTweetDate) : undefined
            }
          />
        </div>
      )}

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
