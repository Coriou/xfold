import { describe, expect, it } from "vitest";
import {
  computeAskedGrok,
  computeAskedGrokShareability,
} from "@/components/share-cards/cards/asked-grok/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticGrokConversation,
  syntheticGrokMessage,
} from "@/lib/archive/__fixtures/synthetic-archive";

function ctx(archive = buildSyntheticArchive()) {
  return { archive, score: computePrivacyScore(archive) };
}

describe("computeAskedGrok", () => {
  it("returns null when archive has no Grok conversations", () => {
    expect(computeAskedGrok(ctx())).toBeNull();
  });

  it("returns null when conversations exist but contain only assistant messages", () => {
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          messages: [syntheticGrokMessage({ sender: "assistant" })],
        }),
      ],
    });
    expect(computeAskedGrok(ctx(archive))).toBeNull();
  });

  it("returns null when user prompts are too short to score", () => {
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          messages: [
            syntheticGrokMessage({ sender: "user", message: "hi" }),
            syntheticGrokMessage({ sender: "user", message: "ok" }),
          ],
        }),
      ],
    });
    expect(computeAskedGrok(ctx(archive))).toBeNull();
  });

  it("includes the earliest user prompt as the first quote", () => {
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          messages: [
            syntheticGrokMessage({
              sender: "user",
              message: "Why is the sky blue?",
              createdAt: "2025-06-01T00:00:00.000Z",
            }),
            syntheticGrokMessage({
              sender: "user",
              message: "How does artificial intelligence learn from data?",
              createdAt: "2025-01-01T00:00:00.000Z",
            }),
          ],
        }),
      ],
    });
    const props = computeAskedGrok(ctx(archive));
    expect(props).not.toBeNull();
    expect(props?.quotes[0]?.text).toBe(
      "How does artificial intelligence learn from data?",
    );
  });

  it("returns up to 3 quotes total", () => {
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          messages: [
            syntheticGrokMessage({
              sender: "user",
              message: "First substantive prompt about something",
              createdAt: "2025-01-01T00:00:00.000Z",
            }),
            syntheticGrokMessage({
              sender: "user",
              message: "Second substantive prompt about something",
              createdAt: "2025-02-01T00:00:00.000Z",
            }),
            syntheticGrokMessage({
              sender: "user",
              message: "Third substantive prompt about something",
              createdAt: "2025-03-01T00:00:00.000Z",
            }),
            syntheticGrokMessage({
              sender: "user",
              message: "Fourth substantive prompt about something",
              createdAt: "2025-04-01T00:00:00.000Z",
            }),
          ],
        }),
      ],
    });
    const props = computeAskedGrok(ctx(archive));
    expect(props?.quotes.length).toBe(3);
  });

  it("counts total messages including assistant turns", () => {
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          messages: [
            syntheticGrokMessage({
              sender: "user",
              message: "Tell me about TypeScript please",
            }),
            syntheticGrokMessage({
              sender: "assistant",
              message: "TypeScript is a typed superset of JavaScript.",
            }),
          ],
        }),
      ],
    });
    const props = computeAskedGrok(ctx(archive));
    expect(props?.totalMessages).toBe(2);
  });

  it("counts conversations", () => {
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          chatId: "a",
          messages: [
            syntheticGrokMessage({
              sender: "user",
              message: "First substantive prompt about something",
            }),
          ],
        }),
        syntheticGrokConversation({
          chatId: "b",
          messages: [
            syntheticGrokMessage({
              sender: "user",
              message: "Second substantive prompt about something",
            }),
          ],
        }),
      ],
    });
    const props = computeAskedGrok(ctx(archive));
    expect(props?.totalConversations).toBe(2);
  });

  it("truncates prompts longer than 160 characters", () => {
    const long = "Why ".repeat(100);
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          messages: [syntheticGrokMessage({ sender: "user", message: long })],
        }),
      ],
    });
    const props = computeAskedGrok(ctx(archive));
    expect(props?.quotes[0]?.text.length).toBeLessThanOrEqual(160);
  });
});

describe("computeAskedGrokShareability", () => {
  it("returns a high specificity and uniqueness score", () => {
    const props = {
      username: "u",
      totalConversations: 5,
      totalMessages: 30,
      oldest: "2025-01-01T00:00:00.000Z",
      quotes: [],
    };
    const score = computeAskedGrokShareability(props);
    expect(score.specificity).toBe(95);
    expect(score.uniqueness).toBe(90);
    expect(score.magnitude).toBeGreaterThan(0);
  });

  it("magnitude scales with conversation count", () => {
    const small = computeAskedGrokShareability({
      username: "u",
      totalConversations: 1,
      totalMessages: 2,
      oldest: "",
      quotes: [],
    });
    const big = computeAskedGrokShareability({
      username: "u",
      totalConversations: 50,
      totalMessages: 200,
      oldest: "",
      quotes: [],
    });
    expect(big.magnitude).toBeGreaterThan(small.magnitude);
  });
});
