// ---------------------------------------------------------------------------
// Grok topic analysis — what did you tell X's AI?
// ---------------------------------------------------------------------------
//
// Clusters Grok conversations by topic and flags sensitive categories.
// Unlike ChatGPT, Grok conversations are tied to your real X identity
// (name, handle, ad profile), making them a unique privacy concern.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";

// --- Types ------------------------------------------------------------------

export interface GrokTopicCluster {
  readonly topic: string;
  readonly messageCount: number;
  readonly conversationCount: number;
  readonly isSensitive: boolean;
  readonly sampleSnippets: readonly string[];
}

export interface GrokAnalysis {
  /** Total conversations. */
  readonly conversationCount: number;
  /** Total messages (user + assistant). */
  readonly totalMessages: number;
  /** Messages from the user. */
  readonly userMessages: number;
  /** Detected topic clusters. */
  readonly topics: readonly GrokTopicCluster[];
  /** Number of sensitive topics detected. */
  readonly sensitiveTopicCount: number;
  /** Longest conversation (by message count). */
  readonly longestConversation: number;
  /** Average messages per conversation. */
  readonly avgMessagesPerConvo: number;
}

// --- Sensitive topic keywords -----------------------------------------------

const SENSITIVE_PATTERNS: readonly {
  topic: string;
  patterns: readonly RegExp[];
}[] = [
  {
    topic: "Health & medical",
    patterns: [
      /\b(doctor|medical|symptom|diagnosis|medication|prescri|therapy|mental health|anxiety|depress|adhd|hospital|cancer|disease)\b/i,
    ],
  },
  {
    topic: "Finance & money",
    patterns: [
      /\b(salary|income|tax|invest|credit|debt|mortgage|loan|bank|crypto|bitcoin|trading|portfolio)\b/i,
    ],
  },
  {
    topic: "Job & career",
    patterns: [
      /\b(resign|fired|job search|interview|resume|cover letter|career change|promotion|raise|boss conflict)\b/i,
    ],
  },
  {
    topic: "Relationships",
    patterns: [
      /\b(breakup|divorce|dating|relationship advice|cheating|partner|spouse|marriage counseling)\b/i,
    ],
  },
  {
    topic: "Legal issues",
    patterns: [
      /\b(lawyer|attorney|lawsuit|legal advice|court|arrested|criminal|contract dispute|intellectual property)\b/i,
    ],
  },
  {
    topic: "Personal identity",
    patterns: [
      /\b(password|social security|address|phone number|identity theft|personal information)\b/i,
    ],
  },
];

// --- Generic topic extraction -----------------------------------------------

const TOPIC_KEYWORDS: readonly {
  topic: string;
  patterns: readonly RegExp[];
}[] = [
  {
    topic: "Programming & tech",
    patterns: [
      /\b(code|programming|javascript|python|api|software|debug|algorithm|database)\b/i,
    ],
  },
  {
    topic: "Writing & content",
    patterns: [
      /\b(write|essay|article|story|blog|content|copywriting|edit|proofread)\b/i,
    ],
  },
  {
    topic: "Science & research",
    patterns: [
      /\b(research|science|study|experiment|hypothesis|data analysis|statistics)\b/i,
    ],
  },
  {
    topic: "Education & learning",
    patterns: [
      /\b(learn|study|course|tutorial|explain|teach|homework|exam|university)\b/i,
    ],
  },
  {
    topic: "Travel & places",
    patterns: [
      /\b(travel|flight|hotel|vacation|trip|destination|itinerary|passport)\b/i,
    ],
  },
  {
    topic: "Food & cooking",
    patterns: [
      /\b(recipe|cook|restaurant|meal|ingredient|dinner|baking|cuisine)\b/i,
    ],
  },
  {
    topic: "Fitness & exercise",
    patterns: [
      /\b(workout|exercise|gym|running|diet|calories|muscle|fitness)\b/i,
    ],
  },
  {
    topic: "Politics & news",
    patterns: [
      /\b(election|politic|government|policy|congress|president|legislation|democrat|republican)\b/i,
    ],
  },
  {
    topic: "Creative & art",
    patterns: [
      /\b(design|art|creative|illustration|music|photography|painting|drawing)\b/i,
    ],
  },
  {
    topic: "Business & strategy",
    patterns: [
      /\b(business|startup|marketing|strategy|management|entrepreneur|revenue|customer)\b/i,
    ],
  },
];

// --- Main -------------------------------------------------------------------

export function buildGrokAnalysis(archive: ParsedArchive): GrokAnalysis | null {
  const convos = archive.grokConversations;
  if (convos.length === 0) return null;

  const totalMessages = convos.reduce((s, c) => s + c.messages.length, 0);
  const userMessages = convos.reduce(
    (s, c) => s + c.messages.filter((m) => m.sender === "user").length,
    0,
  );

  // Collect all user message texts for topic analysis
  const userTexts: string[] = [];
  for (const convo of convos) {
    for (const msg of convo.messages) {
      if (msg.sender === "user") {
        userTexts.push(msg.message);
      }
    }
  }

  // Match topics
  const allPatterns = [...SENSITIVE_PATTERNS, ...TOPIC_KEYWORDS];
  const topicCounts = new Map<
    string,
    {
      messages: number;
      convos: Set<string>;
      sensitive: boolean;
      snippets: string[];
    }
  >();

  for (const convo of convos) {
    const convoMatched = new Set<string>();

    for (const msg of convo.messages) {
      if (msg.sender !== "user") continue;

      for (const tp of allPatterns) {
        if (tp.patterns.some((p) => p.test(msg.message))) {
          const existing = topicCounts.get(tp.topic);
          if (existing) {
            existing.messages++;
            existing.convos.add(convo.chatId);
            if (existing.snippets.length < 2) {
              existing.snippets.push(
                msg.message.slice(0, 80) + (msg.message.length > 80 ? "…" : ""),
              );
            }
          } else {
            topicCounts.set(tp.topic, {
              messages: 1,
              convos: new Set([convo.chatId]),
              sensitive: SENSITIVE_PATTERNS.some((sp) => sp.topic === tp.topic),
              snippets: [
                msg.message.slice(0, 80) + (msg.message.length > 80 ? "…" : ""),
              ],
            });
          }
          convoMatched.add(tp.topic);
        }
      }
    }
  }

  const topics: GrokTopicCluster[] = Array.from(topicCounts.entries())
    .map(([topic, data]) => ({
      topic,
      messageCount: data.messages,
      conversationCount: data.convos.size,
      isSensitive: data.sensitive,
      sampleSnippets: data.snippets,
    }))
    .sort((a, b) => b.messageCount - a.messageCount);

  const longestConversation = Math.max(
    ...convos.map((c) => c.messages.length),
    0,
  );

  return {
    conversationCount: convos.length,
    totalMessages,
    userMessages,
    topics,
    sensitiveTopicCount: topics.filter((t) => t.isSensitive).length,
    longestConversation,
    avgMessagesPerConvo:
      convos.length > 0 ? Math.round(totalMessages / convos.length) : 0,
  };
}
