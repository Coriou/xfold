"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { ParsedArchive, GrokConversation, GrokMessage } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { PillBadge } from "@/components/shared/pill-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime, truncate, pluralize } from "@/lib/format";

export default function GrokConversations({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const conversations = useMemo(
    () =>
      [...archive.grokConversations].sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.createdAt ?? "";
        const bLast = b.messages[b.messages.length - 1]?.createdAt ?? "";
        return bLast.localeCompare(aLast);
      }),
    [archive.grokConversations],
  );

  const totalMessages = conversations.reduce(
    (s, c) => s + c.messages.length,
    0,
  );

  const [selectedId, setSelectedId] = useState(
    conversations[0]?.chatId ?? null,
  );

  const selected = conversations.find((c) => c.chatId === selectedId);

  if (conversations.length === 0) {
    return (
      <div>
        <SectionHeader
          title="Your Grok Conversations"
          description="X stores your Grok chat history in the archive."
        />
        <EmptyState
          title="No Grok conversations found"
          description="Your archive doesn't contain Grok chat data. This likely means you've never used Grok, or X didn't include it in the archive (Grok export coverage has changed multiple times)."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <SectionHeader
        title="Your Grok Conversations"
        description={`X stored ${pluralize(conversations.length, "conversation")} containing ${pluralize(totalMessages, "message")}.`}
        badge={String(conversations.length)}
      />

      <div className="flex flex-1 gap-4 overflow-hidden lg:min-h-[500px]">
        {/* Conversation list */}
        <div className="w-72 shrink-0 overflow-y-auto rounded-xl border border-border bg-background-raised">
          {conversations.map((c) => {
            const firstUserMsg = c.messages.find((m) => m.sender === "user");
            const isActive = c.chatId === selectedId;

            return (
              <button
                key={c.chatId}
                onClick={() => setSelectedId(c.chatId)}
                className={`w-full border-b border-border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? "bg-accent-muted/20"
                    : "hover:bg-background-overlay"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-muted">
                    {formatDateTime(c.messages[0]?.createdAt ?? "")}
                  </span>
                  <PillBadge variant="muted">
                    {c.messages.length}
                  </PillBadge>
                </div>
                <p className="mt-1 truncate text-sm text-foreground">
                  {firstUserMsg
                    ? truncate(firstUserMsg.message, 60)
                    : "Conversation"}
                </p>
              </button>
            );
          })}
        </div>

        {/* Message view */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background-raised">
          {selected ? (
            <MessageView conversation={selected} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-foreground-muted">
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageView({ conversation }: { conversation: GrokConversation }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [conversation.chatId]);

  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
      {conversation.messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: GrokMessage }) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "rounded-br-md bg-accent-muted/30 text-foreground"
            : "rounded-bl-md bg-background-overlay text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.message}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="font-mono text-[10px] text-foreground-muted">
            {formatDateTime(message.createdAt)}
          </span>
          {message.postIds.length > 0 && (
            <span className="text-[10px] text-foreground-muted">
              Referenced {message.postIds.length} posts
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
