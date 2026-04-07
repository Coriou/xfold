import { describe, expect, it } from "vitest";
import {
  computeIdentityTimeline,
  computeIdentityTimelineShareability,
} from "@/components/share-cards/cards/identity-timeline/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticScreenNameChange,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("computeIdentityTimeline", () => {
  it("returns null when there are no screen name changes", () => {
    const archive = buildSyntheticArchive();
    const score = computePrivacyScore(archive);
    expect(computeIdentityTimeline({ archive, score })).toBeNull();
  });

  it("includes the original handle as the first item", () => {
    const archive = buildSyntheticArchive({
      screenNameChanges: [
        syntheticScreenNameChange({
          changedFrom: "original",
          changedTo: "v2",
          changedAt: "2018-01-01T00:00:00.000Z",
        }),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeIdentityTimeline({ archive, score });
    expect(props?.handles[0]?.handle).toBe("original");
    expect(props?.handles[0]?.sinceDate).toBeNull();
    expect(props?.handles[1]?.handle).toBe("v2");
  });

  it("sorts changes chronologically", () => {
    const archive = buildSyntheticArchive({
      screenNameChanges: [
        syntheticScreenNameChange({
          changedFrom: "b",
          changedTo: "c",
          changedAt: "2020-01-01T00:00:00.000Z",
        }),
        syntheticScreenNameChange({
          changedFrom: "a",
          changedTo: "b",
          changedAt: "2018-01-01T00:00:00.000Z",
        }),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeIdentityTimeline({ archive, score });
    expect(props?.handles.map((h) => h.handle)).toEqual(["a", "b", "c"]);
  });
});

describe("computeIdentityTimelineShareability", () => {
  it("scales with number of changes and clamps", () => {
    expect(
      computeIdentityTimelineShareability({
        username: "u",
        handles: [{ handle: "a", sinceDate: null }],
      }),
    ).toBe(0);
    expect(
      computeIdentityTimelineShareability({
        username: "u",
        handles: [
          { handle: "a", sinceDate: null },
          { handle: "b", sinceDate: "2020-01-01T00:00:00.000Z" },
          { handle: "c", sinceDate: "2021-01-01T00:00:00.000Z" },
          { handle: "d", sinceDate: "2022-01-01T00:00:00.000Z" },
          { handle: "e", sinceDate: "2023-01-01T00:00:00.000Z" },
        ],
      }),
    ).toBe(100);
  });
});
