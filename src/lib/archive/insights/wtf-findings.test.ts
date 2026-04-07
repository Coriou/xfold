import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  findWtfMoments,
  pickHeroWtfMoment,
} from "@/lib/archive/insights/wtf-findings";
import {
  buildSyntheticArchive,
  syntheticAdEngagement,
  syntheticAdEngagementBatch,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
  syntheticConnectedApp,
  syntheticDMConversation,
  syntheticDMMessage,
} from "@/lib/archive/__fixtures/synthetic-archive";

const FIXED_NOW = new Date("2026-04-07T12:00:00.000Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("findWtfMoments", () => {
  it("returns no findings for an empty archive", () => {
    expect(findWtfMoments(buildSyntheticArchive())).toEqual([]);
  });

  describe("forgotten-zombie-app", () => {
    it("fires when write-access app is older than the threshold", () => {
      const archive = buildSyntheticArchive({
        connectedApps: [
          syntheticConnectedApp({
            name: "Pearltrees Connect",
            permissions: ["read", "write"],
            approvedAt: "2012-09-25T07:35:16.000Z",
          }),
        ],
      });
      const findings = findWtfMoments(archive);
      const f = findings.find((x) => x.id === "forgotten-zombie-app");
      expect(f).toBeDefined();
      expect(f?.body).toContain("Pearltrees Connect");
      expect(f?.severity).toBe("critical");
      expect(f?.cta?.href).toContain("connected_apps");
    });

    it("does not fire when write-access app is newer than the threshold", () => {
      const archive = buildSyntheticArchive({
        connectedApps: [
          syntheticConnectedApp({
            name: "Recent",
            permissions: ["write"],
            approvedAt: "2024-01-01T00:00:00.000Z",
          }),
        ],
      });
      expect(
        findWtfMoments(archive).find((x) => x.id === "forgotten-zombie-app"),
      ).toBeUndefined();
    });

    it("ignores read-only apps", () => {
      const archive = buildSyntheticArchive({
        connectedApps: [
          syntheticConnectedApp({
            name: "Old Read Only",
            permissions: ["read"],
            approvedAt: "2010-01-01T00:00:00.000Z",
          }),
        ],
      });
      expect(
        findWtfMoments(archive).find((x) => x.id === "forgotten-zombie-app"),
      ).toBeUndefined();
    });

    it("picks the oldest write-access app among many", () => {
      const archive = buildSyntheticArchive({
        connectedApps: [
          syntheticConnectedApp({
            name: "Newer",
            permissions: ["write"],
            approvedAt: "2018-01-01T00:00:00.000Z",
          }),
          syntheticConnectedApp({
            name: "Oldest",
            permissions: ["write"],
            approvedAt: "2014-01-01T00:00:00.000Z",
          }),
        ],
      });
      const f = findWtfMoments(archive).find(
        (x) => x.id === "forgotten-zombie-app",
      );
      expect(f?.body).toContain("Oldest");
    });

    it("does not fire when approvedAt is unparseable", () => {
      const archive = buildSyntheticArchive({
        connectedApps: [
          syntheticConnectedApp({
            name: "Bad",
            permissions: ["write"],
            approvedAt: "garbage",
          }),
        ],
      });
      expect(
        findWtfMoments(archive).find((x) => x.id === "forgotten-zombie-app"),
      ).toBeUndefined();
    });

    it("tiers severity by age", () => {
      const old10 = buildSyntheticArchive({
        connectedApps: [
          syntheticConnectedApp({
            name: "X",
            permissions: ["write"],
            approvedAt: "2017-01-01T00:00:00.000Z", // ~9 years
          }),
        ],
      });
      const f = findWtfMoments(old10).find(
        (x) => x.id === "forgotten-zombie-app",
      );
      expect(f?.severity).toBe("high");

      const old6 = buildSyntheticArchive({
        connectedApps: [
          syntheticConnectedApp({
            name: "X",
            permissions: ["write"],
            approvedAt: "2020-01-01T00:00:00.000Z", // ~6 years
          }),
        ],
      });
      expect(
        findWtfMoments(old6).find((x) => x.id === "forgotten-zombie-app")
          ?.severity,
      ).toBe("medium");
    });
  });

  describe("oldest-stored-dm", () => {
    it("fires for DMs older than 3 years", () => {
      const archive = buildSyntheticArchive({
        directMessages: [
          syntheticDMConversation({
            messages: [
              syntheticDMMessage({
                text: "hi",
                createdAt: "2017-02-27T17:09:25.827Z",
              }),
            ],
          }),
        ],
      });
      const f = findWtfMoments(archive).find((x) => x.id === "oldest-stored-dm");
      expect(f).toBeDefined();
      expect(f?.body).toMatch(/9 years/);
      expect(f?.severity).toBe("high");
    });

    it("does not fire for recent DMs", () => {
      const archive = buildSyntheticArchive({
        directMessages: [
          syntheticDMConversation({
            messages: [
              syntheticDMMessage({
                text: "hi",
                createdAt: "2025-01-01T00:00:00.000Z",
              }),
            ],
          }),
        ],
      });
      expect(
        findWtfMoments(archive).find((x) => x.id === "oldest-stored-dm"),
      ).toBeUndefined();
    });

    it("ignores empty DM messages", () => {
      const archive = buildSyntheticArchive({
        directMessages: [
          syntheticDMConversation({
            messages: [
              syntheticDMMessage({
                text: "  ",
                createdAt: "2017-01-01T00:00:00.000Z",
              }),
            ],
          }),
        ],
      });
      expect(
        findWtfMoments(archive).find((x) => x.id === "oldest-stored-dm"),
      ).toBeUndefined();
    });

    it("ignores DMs with unparseable dates", () => {
      const archive = buildSyntheticArchive({
        directMessages: [
          syntheticDMConversation({
            messages: [
              syntheticDMMessage({ text: "hi", createdAt: "not a date" }),
            ],
          }),
        ],
      });
      expect(
        findWtfMoments(archive).find((x) => x.id === "oldest-stored-dm"),
      ).toBeUndefined();
    });

    it("escalates severity for DMs older than 10 years", () => {
      const archive = buildSyntheticArchive({
        directMessages: [
          syntheticDMConversation({
            messages: [
              syntheticDMMessage({
                text: "ancient",
                createdAt: "2014-01-01T00:00:00.000Z",
              }),
            ],
          }),
        ],
      });
      expect(
        findWtfMoments(archive).find((x) => x.id === "oldest-stored-dm")
          ?.severity,
      ).toBe("critical");
    });
  });

  describe("audience-list-shock", () => {
    it("fires when there is at least 1 list membership", () => {
      const archive = buildSyntheticArchive({
        adImpressions: [
          syntheticAdImpressionBatch([
            syntheticAdImpression({
              targetingCriteria: [
                { targetingType: "List", targetingValue: "List One" },
                { targetingType: "List", targetingValue: "List Two" },
              ],
            }),
          ]),
        ],
      });
      const f = findWtfMoments(archive).find(
        (x) => x.id === "audience-list-shock",
      );
      expect(f).toBeDefined();
      expect(f?.body).toContain("2");
    });

    it("dedupes list names across all sources", () => {
      const archive = buildSyntheticArchive({
        adImpressions: [
          syntheticAdImpressionBatch([
            syntheticAdImpression({
              targetingCriteria: [
                { targetingType: "List", targetingValue: "Same List" },
              ],
            }),
          ]),
        ],
        adEngagements: [
          syntheticAdEngagementBatch([
            syntheticAdEngagement({
              targetingCriteria: [
                { targetingType: "List", targetingValue: "Same List" },
              ],
            }),
          ]),
        ],
      });
      const f = findWtfMoments(archive).find(
        (x) => x.id === "audience-list-shock",
      );
      expect(f?.body).toContain("1");
    });

    it("ignores non-List targeting", () => {
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
        findWtfMoments(archive).find((x) => x.id === "audience-list-shock"),
      ).toBeUndefined();
    });

    it("escalates to critical at 30+ lists", () => {
      const lists: { targetingType: string; targetingValue: string }[] = [];
      for (let i = 0; i < 35; i++) {
        lists.push({ targetingType: "List", targetingValue: `List ${i}` });
      }
      const archive = buildSyntheticArchive({
        adImpressions: [
          syntheticAdImpressionBatch([
            syntheticAdImpression({ targetingCriteria: lists }),
          ]),
        ],
      });
      expect(
        findWtfMoments(archive).find((x) => x.id === "audience-list-shock")
          ?.severity,
      ).toBe("critical");
    });
  });

  it("returns findings sorted by shareability descending", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "Old",
          permissions: ["write"],
          approvedAt: "2012-01-01T00:00:00.000Z",
        }),
      ],
      directMessages: [
        syntheticDMConversation({
          messages: [
            syntheticDMMessage({
              text: "hi",
              createdAt: "2018-01-01T00:00:00.000Z",
            }),
          ],
        }),
      ],
    });
    const findings = findWtfMoments(archive);
    for (let i = 1; i < findings.length; i++) {
      const prev = findings[i - 1];
      const curr = findings[i];
      if (prev && curr) {
        expect(prev.shareability).toBeGreaterThanOrEqual(curr.shareability);
      }
    }
  });
});

describe("pickHeroWtfMoment", () => {
  it("returns null when nothing fires", () => {
    expect(pickHeroWtfMoment(buildSyntheticArchive())).toBeNull();
  });

  it("returns the highest-shareability finding", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "Pearltrees",
          permissions: ["write"],
          approvedAt: "2012-01-01T00:00:00.000Z",
        }),
      ],
    });
    const hero = pickHeroWtfMoment(archive);
    expect(hero?.id).toBe("forgotten-zombie-app");
  });
});
