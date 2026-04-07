"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { ParsedArchive, DMConversation, DMMessage } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { SearchInput } from "@/components/shared/search-input";
import { PillBadge } from "@/components/shared/pill-badge";
import { formatDateTime, truncate, pluralize } from "@/lib/format";

export default function DirectMessages({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const selfId = archive.meta.accountId;
  const [search, setSearch] = useState("");

  const conversations = useMemo(() => {
    const sorted = [...archive.directMessages].sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.createdAt ?? "";
      const bLast = b.messages[b.messages.length - 1]?.createdAt ?? "";
      return bLast.localeCompare(aLast);
    });
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter((c) =>
      c.messages.some((m) => m.text.toLowerCase().includes(q)),
    );
  }, [archive.directMessages, search]);

  const totalMessages = archive.directMessages.reduce(
    (s, c) => s + c.messages.length,
    0,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derive effective selection — fall back to first conversation if selected is filtered out
  const effectiveId = useMemo(() => {
    if (conversations.find((c) => c.conversationId === selectedId)) return selectedId;
    return conversations[0]?.conversationId ?? null;
  }, [conversations, selectedId]);

  const selected = conversations.find((c) => c.conversationId === effectiveId);

  return (
    <div className="flex flex-col">
      <SectionHeader
        title="Your Direct Messages"
        description={`${pluralize(archive.directMessages.length, "conversation")} containing ${pluralize(totalMessages, "message")}.`}
        badge={String(archive.directMessages.length)}
      />

      {archive.directMessages.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">
          No direct messages found in your archive.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4 overflow-hidden lg:min-h-[500px]">
          {/* Conversation list */}
          <div
            className={`flex flex-col overflow-hidden rounded-xl border border-border bg-background-raised ${
              selectedId !== null ? "hidden lg:flex" : "flex"
            } w-full lg:w-72 lg:shrink-0`}
          >
            <div className="border-b border-border p-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search messages…"
                count={search ? conversations.length : undefined}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((c) => {
                const otherParticipant = getOtherParticipant(c.conversationId, selfId);
                const lastMsg = c.messages[c.messages.length - 1];
                const firstUserMsg = c.messages.find((m) => m.senderId === selfId);
                const isActive = c.conversationId === effectiveId;

                return (
                  <button
                    key={c.conversationId}
                    onClick={() => setSelectedId(c.conversationId)}
                    className={`w-full border-b border-border px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "bg-accent-muted/20"
                        : "hover:bg-background-overlay"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-foreground-muted">
                        {otherParticipant}
                      </span>
                      <PillBadge variant="muted">{c.messages.length}</PillBadge>
                    </div>
                    <p className="mt-1 truncate text-sm text-foreground">
                      {truncate(
                        (firstUserMsg ?? lastMsg)?.text ?? "Conversation",
                        60,
                      )}
                    </p>
                    {lastMsg && (
                      <p className="mt-0.5 text-[10px] text-foreground-muted">
                        {formatDateTime(lastMsg.createdAt)}
                      </p>
                    )}
                  </button>
                );
              })}
              {conversations.length === 0 && (
                <p className="p-4 text-center text-xs text-foreground-muted">
                  No conversations match.
                </p>
              )}
            </div>
          </div>

          {/* Message view */}
          <div
            className={`flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background-raised ${
              selectedId !== null ? "flex" : "hidden lg:flex"
            }`}
          >
            {selected ? (
              <DMMessageView
                conversation={selected}
                selfId={selfId}
                onBack={() => setSelectedId(null)}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-foreground-muted">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DMMessageView({
  conversation,
  selfId,
  onBack,
}: {
  conversation: DMConversation;
  selfId: string;
  onBack: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [conversation.conversationId]);

  return (
    <>
      {/* Mobile back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 border-b border-border px-4 py-2.5 text-sm text-foreground-muted transition-colors hover:text-foreground lg:hidden"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {conversation.messages.map((msg, i) => (
          <DMBubble key={i} message={msg} isSelf={msg.senderId === selfId} />
        ))}
      </div>
    </>
  );
}

function DMBubble({
  message,
  isSelf,
}: {
  message: DMMessage;
  isSelf: boolean;
}) {
  return (
    <div className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isSelf
            ? "rounded-br-md bg-accent-muted/30 text-foreground"
            : "rounded-bl-md bg-background-overlay text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {message.reactions.map((r, i) => (
              <PillBadge key={i} variant="muted">
                {r.reactionKey}
              </PillBadge>
            ))}
          </div>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          <span className="font-mono text-[10px] text-foreground-muted">
            {formatDateTime(message.createdAt)}
          </span>
          {message.isWelcomeMessage && (
            <PillBadge variant="muted">welcome</PillBadge>
          )}
          {message.mediaUrls.length > 0 && (
            <span className="text-[10px] text-foreground-muted">
              {message.mediaUrls.length} attachment{message.mediaUrls.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function getOtherParticipant(conversationId: string, selfId: string): string {
  const parts = conversationId.split("-");
  const other = parts.find((p) => p !== selfId);
  return other ? `User ${other}` : conversationId;
}
