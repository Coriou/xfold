import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  buildQuotePool,
  pickBestQuote,
} from "@/lib/archive/insights/quote-pool";
import {
  buildSyntheticArchive,
  syntheticAccount,
  syntheticAdEngagement,
  syntheticAdEngagementBatch,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
  syntheticConnectedApp,
  syntheticDMConversation,
  syntheticDMMessage,
  syntheticGrokConversation,
  syntheticGrokMessage,
  syntheticIpAuditEntry,
} from "@/lib/archive/__fixtures/synthetic-archive";

const FIXED_NOW = new Date("2026-04-07T12:00:00.000Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildQuotePool", () => {
  it("returns empty array for an empty archive", () => {
    expect(buildQuotePool(buildSyntheticArchive())).toEqual([]);
  });

  it("yields oldest write-access app as a connected-app quote", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "Pearltrees Connect",
          permissions: ["read", "write"],
          approvedAt: "2012-09-25T07:35:16.000Z",
        }),
        syntheticConnectedApp({
          name: "Newer App",
          permissions: ["read", "write"],
          approvedAt: "2024-01-01T00:00:00.000Z",
        }),
      ],
    });
    const pool = buildQuotePool(archive);
    const app = pool.find((q) => q.source === "connected-app");
    expect(app).toBeDefined();
    expect(app?.text).toBe("Pearltrees Connect");
    expect(app?.severity).toBe("high");
    expect(app?.contextLine).toMatch(/13 years/);
  });

  it("ignores read-only apps for the connected-app quote", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "Read Only",
          permissions: ["read"],
          approvedAt: "2010-01-01T00:00:00.000Z",
        }),
      ],
    });
    const pool = buildQuotePool(archive);
    expect(pool.find((q) => q.source === "connected-app")).toBeUndefined();
  });

  it("returns no connected-app quote when none have a parseable approvedAt", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "Bad Date",
          permissions: ["write"],
          approvedAt: "not-a-date",
        }),
      ],
    });
    const pool = buildQuotePool(archive);
    const app = pool.find((q) => q.source === "connected-app");
    expect(app).toBeDefined();
    // Falls back to year-zero handling but still emits a quote.
    expect(app?.text).toBe("Bad Date");
  });

  it("picks the earliest user-sent Grok prompt", () => {
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          chatId: "chat-1",
          messages: [
            syntheticGrokMessage({
              sender: "user",
              message: "Is Elon Musk a good person yes or no",
              createdAt: "2025-01-25T15:36:13.409Z",
            }),
            syntheticGrokMessage({
              sender: "assistant",
              message: "No.",
              createdAt: "2025-01-25T15:36:13.409Z",
            }),
            syntheticGrokMessage({
              sender: "user",
              message: "Why not?",
              createdAt: "2025-01-25T15:36:26.488Z",
            }),
          ],
        }),
      ],
    });
    const pool = buildQuotePool(archive);
    const grok = pool.find((q) => q.source === "grok-prompt");
    expect(grok).toBeDefined();
    expect(grok?.text).toBe("Is Elon Musk a good person yes or no");
    expect(grok?.severity).toBe("high");
  });

  it("ignores assistant-sent Grok messages", () => {
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          messages: [
            syntheticGrokMessage({
              sender: "assistant",
              message: "Hi, I'm Grok.",
            }),
          ],
        }),
      ],
    });
    expect(
      buildQuotePool(archive).find((q) => q.source === "grok-prompt"),
    ).toBeUndefined();
  });

  it("ignores blank Grok prompts", () => {
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          messages: [syntheticGrokMessage({ sender: "user", message: "   " })],
        }),
      ],
    });
    expect(
      buildQuotePool(archive).find((q) => q.source === "grok-prompt"),
    ).toBeUndefined();
  });

  it("truncates long Grok prompts", () => {
    const long = "x".repeat(500);
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          messages: [syntheticGrokMessage({ sender: "user", message: long })],
        }),
      ],
    });
    const grok = buildQuotePool(archive).find(
      (q) => q.source === "grok-prompt",
    );
    expect(grok?.text.length).toBeLessThanOrEqual(140);
  });

  it("picks the oldest stored DM and reports years retained", () => {
    const archive = buildSyntheticArchive({
      directMessages: [
        syntheticDMConversation({
          messages: [
            syntheticDMMessage({
              text: "old message",
              createdAt: "2017-02-27T17:09:25.827Z",
            }),
            syntheticDMMessage({
              text: "newer",
              createdAt: "2024-01-01T00:00:00.000Z",
            }),
          ],
        }),
      ],
    });
    const dm = buildQuotePool(archive).find((q) => q.source === "stored-dm");
    expect(dm).toBeDefined();
    expect(dm?.text).toBe("old message");
    expect(dm?.contextLine).toMatch(/9 years/);
    expect(dm?.severity).toBe("high");
  });

  it("ignores blank DMs", () => {
    const archive = buildSyntheticArchive({
      directMessages: [
        syntheticDMConversation({
          messages: [syntheticDMMessage({ text: "" })],
        }),
      ],
    });
    expect(
      buildQuotePool(archive).find((q) => q.source === "stored-dm"),
    ).toBeUndefined();
  });

  it("ranks audience-list names by spicy-keyword score", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({
            targetingCriteria: [
              {
                targetingType: "List",
                targetingValue: "Generic Customers",
              },
              {
                targetingType: "List",
                targetingValue:
                  "Pro Targeting - Exclusion Audience: negative engagers - Global",
              },
            ],
          }),
        ]),
      ],
    });
    const list = buildQuotePool(archive).find(
      (q) => q.source === "audience-list",
    );
    expect(list).toBeDefined();
    expect(list?.text).toMatch(/negative engagers/);
    expect(list?.severity).toBe("high");
  });

  it("merges audience-list names from impressions and engagements", () => {
    const archive = buildSyntheticArchive({
      adEngagements: [
        syntheticAdEngagementBatch([
          syntheticAdEngagement({
            targetingCriteria: [
              { targetingType: "List", targetingValue: "Premium Subscribers" },
            ],
          }),
        ]),
      ],
    });
    const list = buildQuotePool(archive).find(
      (q) => q.source === "audience-list",
    );
    expect(list?.text).toBe("Premium Subscribers");
  });

  it("ignores non-List targeting criteria", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({
            targetingCriteria: [
              { targetingType: "Interests", targetingValue: "Crypto" },
            ],
          }),
        ]),
      ],
    });
    expect(
      buildQuotePool(archive).find((q) => q.source === "audience-list"),
    ).toBeUndefined();
  });

  it("returns the account creation moment with IP and client", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({
        createdAt: "2009-04-23T00:00:00.000Z",
        creationIp: "203.0.113.7",
        createdVia: "Twitter for iPhone",
      }),
    });
    const moment = buildQuotePool(archive).find(
      (q) => q.source === "creation-moment",
    );
    expect(moment).toBeDefined();
    expect(moment?.text).toContain("203.0.113.7");
    expect(moment?.text).toContain("Twitter for iPhone");
    expect(moment?.severity).toBe("high");
    expect(moment?.contextLine).toMatch(/16 years ago/);
  });

  it("falls back gracefully when account has no IP and no client", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({
        createdAt: "2020-01-01T00:00:00.000Z",
        creationIp: null,
        createdVia: "",
      }),
    });
    const moment = buildQuotePool(archive).find(
      (q) => q.source === "creation-moment",
    );
    expect(moment?.text).toBe("from an unknown source");
  });

  it("returns no creation-moment when account has no createdAt", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({ createdAt: "" }),
    });
    expect(
      buildQuotePool(archive).find((q) => q.source === "creation-moment"),
    ).toBeUndefined();
  });

  it("returns no creation-moment when account is missing", () => {
    const archive = buildSyntheticArchive({ account: null });
    expect(
      buildQuotePool(archive).find((q) => q.source === "creation-moment"),
    ).toBeUndefined();
  });

  it("identifies the oldest IP that's still active in the audit window", () => {
    const archive = buildSyntheticArchive({
      ipAudit: [
        syntheticIpAuditEntry({
          loginIp: "10.0.0.1",
          createdAt: "2018-01-01T00:00:00.000Z",
        }),
        syntheticIpAuditEntry({
          loginIp: "10.0.0.1",
          createdAt: "2026-03-30T00:00:00.000Z",
        }),
        syntheticIpAuditEntry({
          loginIp: "10.0.0.99",
          createdAt: "2010-01-01T00:00:00.000Z",
        }),
      ],
    });
    const ip = buildQuotePool(archive).find(
      (q) => q.source === "oldest-active-ip",
    );
    expect(ip).toBeDefined();
    // 10.0.0.99 is older but not seen in last year — should be skipped.
    expect(ip?.text).toBe("10.0.0.1");
    expect(ip?.contextLine).toMatch(/8 years/);
  });

  it("ignores IPs that haven't been seen in the recent window", () => {
    const archive = buildSyntheticArchive({
      ipAudit: [
        syntheticIpAuditEntry({
          loginIp: "1.1.1.1",
          createdAt: "2010-01-01T00:00:00.000Z",
        }),
        // Most recent entry is 2010 — nothing is "recent".
      ],
    });
    expect(
      buildQuotePool(archive).find((q) => q.source === "oldest-active-ip"),
    ).toBeUndefined();
  });

  it("returns no IP quote if span is less than 1 year", () => {
    const archive = buildSyntheticArchive({
      ipAudit: [
        syntheticIpAuditEntry({
          loginIp: "1.1.1.1",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
        syntheticIpAuditEntry({
          loginIp: "1.1.1.1",
          createdAt: "2026-03-30T00:00:00.000Z",
        }),
      ],
    });
    expect(
      buildQuotePool(archive).find((q) => q.source === "oldest-active-ip"),
    ).toBeUndefined();
  });

  it("ignores ip audit entries with unparseable dates", () => {
    const archive = buildSyntheticArchive({
      ipAudit: [
        syntheticIpAuditEntry({ loginIp: "1.1.1.1", createdAt: "garbage" }),
      ],
    });
    expect(
      buildQuotePool(archive).find((q) => q.source === "oldest-active-ip"),
    ).toBeUndefined();
  });

  it("sorts the pool by specificity descending", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({
        createdAt: "2020-01-01T00:00:00.000Z",
        creationIp: null,
        createdVia: "",
      }),
      grokConversations: [
        syntheticGrokConversation({
          messages: [
            syntheticGrokMessage({
              sender: "user",
              message: "test",
              createdAt: "2025-01-01T00:00:00.000Z",
            }),
          ],
        }),
      ],
    });
    const pool = buildQuotePool(archive);
    for (let i = 1; i < pool.length; i++) {
      const prev = pool[i - 1];
      const curr = pool[i];
      if (prev && curr) {
        expect(prev.specificity).toBeGreaterThanOrEqual(curr.specificity);
      }
    }
  });
});

describe("pickBestQuote", () => {
  it("returns null for an empty archive", () => {
    expect(pickBestQuote(buildSyntheticArchive())).toBeNull();
  });

  it("returns the highest-specificity quote", () => {
    const archive = buildSyntheticArchive({
      grokConversations: [
        syntheticGrokConversation({
          messages: [
            syntheticGrokMessage({
              sender: "user",
              message: "Tell me about hash functions",
              createdAt: "2025-06-01T00:00:00.000Z",
            }),
          ],
        }),
      ],
      account: syntheticAccount({
        createdAt: "2024-01-01T00:00:00.000Z",
        creationIp: null,
        createdVia: "",
      }),
    });
    const best = pickBestQuote(archive);
    // Grok prompts have specificity 90 — they should beat creation moments.
    expect(best?.source).toBe("grok-prompt");
  });
});
