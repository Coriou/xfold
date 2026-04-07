"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { buildGrokAnalysis } from "@/lib/archive/insights/grok-analysis";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";

export default function GrokInsights({ archive }: { archive: ParsedArchive }) {
  const analysis = useMemo(() => buildGrokAnalysis(archive), [archive]);

  if (!analysis) {
    return (
      <div>
        <SectionHeader
          title="Grok AI Deep Dive"
          description="What you told X's AI — and why it matters."
        />
        <EmptyState title="No Grok conversations found in your archive" />
      </div>
    );
  }

  const sensitiveTopics = analysis.topics.filter((t) => t.isSensitive);
  const generalTopics = analysis.topics.filter((t) => !t.isSensitive);

  return (
    <div>
      <SectionHeader
        title="Grok AI Deep Dive"
        description="What you told X's AI — and why it matters."
        badge={`${analysis.conversationCount} conversations`}
      />

      {/* Warning banner */}
      <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-5">
        <p className="text-sm font-semibold text-danger">
          Unlike ChatGPT or Claude, Grok conversations are tied to your real X
          identity.
        </p>
        <p className="mt-1 text-sm text-foreground-muted">
          Your name, handle, ad profile, and targeting data are all linked to
          these conversations. X stores them indefinitely.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Conversations" value={analysis.conversationCount} />
        <StatCard
          label="Your messages"
          value={analysis.userMessages}
          subtitle={`${analysis.totalMessages} total with replies`}
        />
        <StatCard
          label="Sensitive topics"
          value={analysis.sensitiveTopicCount}
          variant={analysis.sensitiveTopicCount > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Longest conversation"
          value={`${analysis.longestConversation} msgs`}
        />
      </div>

      {/* Sensitive topics — highlighted */}
      {sensitiveTopics.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-danger">
            Sensitive Topics Detected
          </h3>
          <p className="mb-3 text-sm text-foreground-muted">
            You discussed these sensitive topics with Grok. This data is stored
            alongside your real identity and ad targeting profile.
          </p>
          <div className="space-y-3">
            {sensitiveTopics.map((topic) => (
              <div
                key={topic.topic}
                className="rounded-xl border border-danger/20 bg-danger/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-danger" />
                    <h4 className="text-sm font-semibold text-foreground">
                      {topic.topic}
                    </h4>
                  </div>
                  <span className="shrink-0 text-xs text-foreground-muted">
                    {topic.messageCount} message
                    {topic.messageCount !== 1 ? "s" : ""} across{" "}
                    {topic.conversationCount} conversation
                    {topic.conversationCount !== 1 ? "s" : ""}
                  </span>
                </div>
                {topic.sampleSnippets.length > 0 && (
                  <div className="mt-2 space-y-1 pl-5">
                    {topic.sampleSnippets.map((snippet, i) => (
                      <p
                        key={i}
                        className="text-xs italic text-foreground-muted"
                      >
                        &ldquo;{snippet}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* General topics */}
      {generalTopics.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Topic Breakdown
          </h3>
          <div className="space-y-2">
            {generalTopics.map((topic) => {
              const maxCount = generalTopics[0]?.messageCount ?? 1;
              const widthPct = Math.max(
                5,
                (topic.messageCount / maxCount) * 100,
              );
              return (
                <div key={topic.topic} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-right text-xs text-foreground-muted">
                    {topic.topic}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-foreground/5">
                    <div
                      className="h-full rounded bg-accent/50"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right font-mono text-xs text-foreground-muted">
                    {topic.messageCount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action */}
      <div className="rounded-xl border border-border bg-background-raised p-4">
        <p className="text-sm text-foreground-muted">
          <strong className="text-foreground">Want to clean this up?</strong>{" "}
          You can manage your Grok conversation history in X&apos;s settings.
        </p>
        <a
          href="https://x.com/settings/grok"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-medium text-accent transition-colors hover:text-accent-hover"
        >
          Manage Grok data ↗
        </a>
      </div>
    </div>
  );
}
