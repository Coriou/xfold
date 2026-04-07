import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  computeDoorsOpen,
  computeDoorsOpenShareability,
} from "@/components/share-cards/cards/doors-open/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticConnectedApp,
} from "@/lib/archive/__fixtures/synthetic-archive";

const FIXED_NOW = new Date("2026-04-07T12:00:00.000Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function ctx(archive = buildSyntheticArchive()) {
  return { archive, score: computePrivacyScore(archive) };
}

describe("computeDoorsOpen", () => {
  it("returns null when archive has no connected apps", () => {
    expect(computeDoorsOpen(ctx())).toBeNull();
  });

  it("returns null when there are fewer than 3 write-access apps", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "App1",
          permissions: ["read", "write"],
          approvedAt: "2015-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "App2",
          permissions: ["read", "write"],
          approvedAt: "2016-01-01T00:00:00.000Z",
        }),
      ],
    });
    expect(computeDoorsOpen(ctx(archive))).toBeNull();
  });

  it("returns null when oldest write-app is younger than threshold", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "A",
          permissions: ["write"],
          approvedAt: "2025-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "B",
          permissions: ["write"],
          approvedAt: "2025-06-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "C",
          permissions: ["write"],
          approvedAt: "2024-12-01T00:00:00.000Z",
        }),
      ],
    });
    expect(computeDoorsOpen(ctx(archive))).toBeNull();
  });

  it("ignores read-only apps for the write-app count", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "Read",
          permissions: ["read"],
          approvedAt: "2010-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "W1",
          permissions: ["write"],
          approvedAt: "2015-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "W2",
          permissions: ["write"],
          approvedAt: "2016-01-01T00:00:00.000Z",
        }),
      ],
    });
    // Only 2 write apps → null
    expect(computeDoorsOpen(ctx(archive))).toBeNull();
  });

  it("returns props when there are 3+ write apps and one is older than threshold", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "Old",
          permissions: ["write"],
          approvedAt: "2012-09-25T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "Mid",
          permissions: ["write"],
          approvedAt: "2018-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "New",
          permissions: ["write"],
          approvedAt: "2024-06-01T00:00:00.000Z",
        }),
      ],
    });
    const props = computeDoorsOpen(ctx(archive));
    expect(props).not.toBeNull();
    expect(props?.writeAppCount).toBe(3);
    expect(props?.totalApps).toBe(3);
    expect(props?.oldestYearsAgo).toBe(13);
    expect(props?.entries[0]?.name).toBe("Old");
  });

  it("sorts entries by approved date ascending", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "C",
          permissions: ["write"],
          approvedAt: "2020-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "A",
          permissions: ["write"],
          approvedAt: "2014-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "B",
          permissions: ["write"],
          approvedAt: "2017-01-01T00:00:00.000Z",
        }),
      ],
    });
    const props = computeDoorsOpen(ctx(archive));
    expect(props?.entries.map((e) => e.name)).toEqual(["A", "B", "C"]);
  });

  it("limits entries to 5", () => {
    const apps = Array.from({ length: 8 }, (_, i) =>
      syntheticConnectedApp({
        id: `app-${i}`,
        name: `App ${i}`,
        permissions: ["write"],
        approvedAt: `${2010 + i}-01-01T00:00:00.000Z`,
      }),
    );
    const archive = buildSyntheticArchive({ connectedApps: apps });
    const props = computeDoorsOpen(ctx(archive));
    expect(props?.entries.length).toBe(5);
  });

  it("flags DM permission separately when present", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "DM",
          permissions: ["read", "write", "Direct Message"],
          approvedAt: "2014-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "B",
          permissions: ["write"],
          approvedAt: "2018-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "C",
          permissions: ["write"],
          approvedAt: "2018-01-01T00:00:00.000Z",
        }),
      ],
    });
    const props = computeDoorsOpen(ctx(archive));
    const dmEntry = props?.entries.find((e) => e.name === "DM");
    expect(dmEntry?.hasDmAccess).toBe(true);
    const bEntry = props?.entries.find((e) => e.name === "B");
    expect(bEntry?.hasDmAccess).toBe(false);
  });

  it("falls back to id when name is empty", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          id: "fallback-id",
          name: "",
          permissions: ["write"],
          approvedAt: "2014-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "B",
          permissions: ["write"],
          approvedAt: "2018-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "C",
          permissions: ["write"],
          approvedAt: "2018-01-01T00:00:00.000Z",
        }),
      ],
    });
    const props = computeDoorsOpen(ctx(archive));
    expect(props?.entries[0]?.name).toBe("fallback-id");
  });

  it("skips apps with unparseable approved dates", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "Bad",
          permissions: ["write"],
          approvedAt: "garbage",
        }),
        syntheticConnectedApp({
          name: "OK1",
          permissions: ["write"],
          approvedAt: "2014-01-01T00:00:00.000Z",
        }),
        syntheticConnectedApp({
          name: "OK2",
          permissions: ["write"],
          approvedAt: "2018-01-01T00:00:00.000Z",
        }),
      ],
    });
    // Bad date → only 2 valid entries → below MIN_WRITE_APPS = null
    expect(computeDoorsOpen(ctx(archive))).toBeNull();
  });
});

describe("computeDoorsOpenShareability", () => {
  it("uniqueness scales with oldestYearsAgo", () => {
    const recent = computeDoorsOpenShareability({
      username: "u",
      totalApps: 5,
      writeAppCount: 5,
      oldestYearsAgo: 3,
      entries: [],
    });
    const ancient = computeDoorsOpenShareability({
      username: "u",
      totalApps: 5,
      writeAppCount: 5,
      oldestYearsAgo: 13,
      entries: [],
    });
    expect(ancient.uniqueness).toBeGreaterThan(recent.uniqueness);
  });

  it("magnitude scales with writeAppCount", () => {
    const few = computeDoorsOpenShareability({
      username: "u",
      totalApps: 3,
      writeAppCount: 3,
      oldestYearsAgo: 5,
      entries: [],
    });
    const many = computeDoorsOpenShareability({
      username: "u",
      totalApps: 12,
      writeAppCount: 12,
      oldestYearsAgo: 5,
      entries: [],
    });
    expect(many.magnitude).toBeGreaterThan(few.magnitude);
  });

  it("specificity is constant at 80", () => {
    expect(
      computeDoorsOpenShareability({
        username: "u",
        totalApps: 1,
        writeAppCount: 1,
        oldestYearsAgo: 1,
        entries: [],
      }).specificity,
    ).toBe(80);
  });
});
