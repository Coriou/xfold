import { brand } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import {
  CardFooter,
  CardFrame,
  CardHeader,
  QuoteBlock,
} from "../../_primitives";
import type { FirstAndLastCardProps } from "./compute";

export function FirstAndLastCard(props: FirstAndLastCardProps) {
  return (
    <CardFrame>
      <CardHeader title="First & Last" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          marginTop: 16,
        }}
      >
        <QuoteBlock
          caption="Your very first tweet"
          text={props.firstText}
          date={formatDate(props.firstDate)}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              backgroundColor: brand.border,
            }}
          />
          <div
            style={{
              fontSize: 16,
              color: brand.foregroundMuted,
              fontFamily: "monospace",
            }}
          >
            {props.daysBetween.toLocaleString("en-US")} days later
          </div>
          <div
            style={{
              flex: 1,
              height: 1,
              backgroundColor: brand.border,
            }}
          />
        </div>

        <QuoteBlock
          caption="Your latest tweet"
          text={props.lastText}
          date={formatDate(props.lastDate)}
        />
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
