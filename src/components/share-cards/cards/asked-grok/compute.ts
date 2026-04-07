import { parseDate, truncate } from "@/lib/format";
import type { ComputeContext } from "../../types";

export interface AskedGrokQuote {
  readonly text: string;
  readonly createdAt: string;
}

export interface AskedGrokCardProps {
  readonly username: string;
  readonly totalConversations: number;
  readonly totalMessages: number;
  readonly oldest: string;
  readonly quotes: readonly AskedGrokQuote[];
}

interface ScoredPrompt {
  readonly text: string;
  readonly createdAt: string;
  readonly ts: number;
  readonly score: number;
}

const MIN_PROMPT_LENGTH = 8;

/** Heuristic: longer, more "natural language" prompts beat one-word queries. */
function scorePrompt(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length < MIN_PROMPT_LENGTH) return 0;

  // Length contributes up to 60 points (saturating around 200 chars).
  const lengthScore = Math.min(60, trimmed.length / 3.5);

  // Word count contributes up to 30 points.
  const wordCount = trimmed.split(/\s+/).length;
  const wordScore = Math.min(30, wordCount * 2);

  // Question prompts ("?", "what", "why", "how", "is", "tell") get +10.
  const lower = trimmed.toLowerCase();
  let intentScore = 0;
  if (
    lower.includes("?") ||
    /\b(what|why|how|is|are|tell|explain|who|when)\b/.test(lower)
  ) {
    intentScore = 10;
  }

  return lengthScore + wordScore + intentScore;
}

export function computeAskedGrok(
  ctx: ComputeContext,
): AskedGrokCardProps | null {
  const conversations = ctx.archive.grokConversations;
  if (conversations.length === 0) return null;

  const userPrompts: ScoredPrompt[] = [];
  let totalMessages = 0;
  let earliest = Infinity;

  for (const convo of conversations) {
    for (const msg of convo.messages) {
      totalMessages++;
      if (msg.sender !== "user") continue;
      if (!msg.message.trim()) continue;
      const ts = parseDate(msg.createdAt)?.getTime() ?? Infinity;
      if (ts < earliest) earliest = ts;
      const score = scorePrompt(msg.message);
      if (score > 0) {
        userPrompts.push({
          text: msg.message.trim(),
          createdAt: msg.createdAt,
          ts,
          score,
        });
      }
    }
  }

  if (userPrompts.length === 0) return null;

  // Pick top 3 by score, but always include the earliest user prompt as the
  // first quote (the "first thing you ever asked" framing is the strongest).
  const byTimestamp = [...userPrompts].sort((a, b) => a.ts - b.ts);
  const firstEver = byTimestamp[0];
  if (!firstEver) return null;

  const remaining = userPrompts.filter((p) => p !== firstEver);
  remaining.sort((a, b) => b.score - a.score);

  const quotes: AskedGrokQuote[] = [
    { text: truncate(firstEver.text, 160), createdAt: firstEver.createdAt },
  ];
  for (const p of remaining) {
    if (quotes.length >= 3) break;
    quotes.push({ text: truncate(p.text, 160), createdAt: p.createdAt });
  }

  return {
    username: ctx.archive.meta.username,
    totalConversations: conversations.length,
    totalMessages,
    oldest:
      earliest === Infinity
        ? firstEver.createdAt
        : new Date(earliest).toISOString(),
    quotes,
  };
}

export function computeAskedGrokShareability(props: AskedGrokCardProps) {
  // Grok prompts are inherently personal and rare in archives. Specificity
  // and uniqueness are both very high. Magnitude scales with conversation
  // count.
  return {
    magnitude: Math.min(100, 30 + props.totalConversations * 4),
    specificity: 95,
    uniqueness: 90,
  };
}
