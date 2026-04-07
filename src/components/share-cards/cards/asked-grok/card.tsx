import { brand } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { AskedGrokCardProps } from "./compute";

export function AskedGrokCard(props: AskedGrokCardProps) {
  return (
    <CardFrame>
      <CardHeader title="What I asked Grok" />

      <div
        style={{
          textAlign: "center",
          marginTop: 8,
          marginBottom: 24,
          fontSize: 18,
          color: brand.foregroundMuted,
        }}
      >
        X stored every word.{" "}
        {props.totalConversations.toLocaleString("en-US")} conversations,{" "}
        {props.totalMessages.toLocaleString("en-US")} messages on file.
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          padding: "0 8px",
        }}
      >
        {props.quotes.map((q, i) => (
          <ChatBubble
            key={i}
            text={q.text}
            date={formatDate(q.createdAt)}
            isFirst={i === 0}
          />
        ))}
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}

function ChatBubble({
  text,
  date,
  isFirst,
}: {
  text: string;
  date: string;
  isFirst: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          backgroundColor: isFirst ? brand.accent : brand.backgroundRaised,
          color: isFirst ? brand.background : brand.foreground,
          borderRadius: 24,
          borderBottomRightRadius: 8,
          padding: "20px 26px",
          fontSize: 22,
          lineHeight: 1.4,
          fontWeight: 500,
        }}
      >
        {text}
      </div>
      <div
        style={{
          fontSize: 14,
          color: brand.foregroundMuted,
          marginTop: 6,
          marginRight: 8,
        }}
      >
        {isFirst ? `first prompt · ${date}` : date}
      </div>
    </div>
  );
}
