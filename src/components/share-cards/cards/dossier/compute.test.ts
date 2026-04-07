import { describe, expect, it } from "vitest";
import {
  computeDossier,
  computeDossierShareability,
} from "@/components/share-cards/cards/dossier/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticLike,
  syntheticPersonalization,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

function ctx(archive = buildSyntheticArchive()) {
  return { archive, score: computePrivacyScore(archive) };
}

describe("computeDossier", () => {
  it("returns null when archive has no personalization", () => {
    expect(computeDossier(ctx())).toBeNull();
  });

  it("returns null when personalization is empty across all signal fields", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization(),
    });
    expect(computeDossier(ctx(archive))).toBeNull();
  });

  it("returns props when at least gender is present", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({ gender: "male" }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.gender).toBe("male");
  });

  it("flags interests with no tweet/like evidence as noEvidence: true", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ fullText: "I love coding in TypeScript today" }),
      ],
      personalization: syntheticPersonalization({
        gender: "male",
        interests: [
          { name: "TypeScript", isDisabled: false },
          { name: "Badminton", isDisabled: false },
        ],
      }),
    });
    const props = computeDossier(ctx(archive));
    const ts = props?.interests.find((i) => i.name === "TypeScript");
    const bad = props?.interests.find((i) => i.name === "Badminton");
    expect(ts?.noEvidence).toBe(false);
    expect(bad?.noEvidence).toBe(true);
  });

  it("considers like text as evidence too", () => {
    const archive = buildSyntheticArchive({
      likes: [
        syntheticLike({ fullText: "great article about cryptocurrency" }),
      ],
      personalization: syntheticPersonalization({
        gender: "male",
        interests: [{ name: "Cryptocurrency", isDisabled: false }],
      }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.interests[0]?.noEvidence).toBe(false);
  });

  it("excludes disabled interests", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        gender: "male",
        interests: [
          { name: "Active", isDisabled: false },
          { name: "Disabled", isDisabled: true },
        ],
      }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.interests.map((i) => i.name)).toEqual(["Active"]);
    expect(props?.totalInterests).toBe(1);
  });

  it("ranks no-evidence interests above ones with evidence", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet({ fullText: "love rust programming" })],
      personalization: syntheticPersonalization({
        gender: "male",
        interests: [
          { name: "rust", isDisabled: false },
          { name: "Andrew Tate", isDisabled: false },
        ],
      }),
    });
    const props = computeDossier(ctx(archive));
    // "Andrew Tate" has no evidence, so it should rank first.
    expect(props?.interests[0]?.name).toBe("Andrew Tate");
  });

  it("limits interests to 6", () => {
    const interests = Array.from({ length: 12 }, (_, i) => ({
      name: `Interest ${i}`,
      isDisabled: false,
    }));
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({ gender: "male", interests }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.interests.length).toBe(6);
    expect(props?.totalInterests).toBe(12);
  });

  it("limits shows to 2", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        gender: "male",
        shows: ["Show A", "Show B", "Show C", "Show D"],
      }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.shows).toEqual(["Show A", "Show B"]);
  });

  it("filters disabled languages", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        gender: "male",
        languages: [
          { language: "English", isDisabled: false },
          { language: "Klingon", isDisabled: true },
        ],
      }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.languages).toEqual(["English"]);
  });

  it("composes location string from city/region/country when available", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        gender: "male",
        locationHistory: [
          {
            city: "Paris",
            region: "Île-de-France",
            country: "France",
            capturedAt: "2026-01-01",
          },
        ],
      }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.location).toBe("Paris, Île-de-France, France");
  });

  it("returns null location when locationHistory is empty", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({ gender: "male" }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.location).toBeNull();
  });

  it("returns null location when location entry has all-null fields", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        gender: "male",
        locationHistory: [
          { city: null, region: null, country: null, capturedAt: null },
        ],
      }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.location).toBeNull();
  });

  it("counts numAudiences and numLookalikes", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        gender: "male",
        numAudiences: 17,
        lookalikeAdvertisers: ["@a", "@b", "@c"],
      }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.numAudiences).toBe(17);
    expect(props?.numLookalikes).toBe(3);
  });

  it("uses meta.displayName and accountId", () => {
    const archive = buildSyntheticArchive({
      meta: {
        generationDate: "",
        sizeBytes: 0,
        isPartialArchive: false,
        accountId: "12345",
        username: "user",
        displayName: "Display Name",
      },
      personalization: syntheticPersonalization({ gender: "male" }),
    });
    const props = computeDossier(ctx(archive));
    expect(props?.accountId).toBe("12345");
    expect(props?.displayName).toBe("Display Name");
  });
});

describe("computeDossierShareability", () => {
  it("boosts specificity when an interest has no evidence", () => {
    const withFlag = computeDossierShareability({
      username: "u",
      displayName: "U",
      accountId: "1",
      gender: "male",
      ageRange: null,
      languages: [],
      location: null,
      interests: [{ name: "X", noEvidence: true }],
      totalInterests: 1,
      shows: [],
      numAudiences: 0,
      numLookalikes: 0,
    });
    const without = computeDossierShareability({
      username: "u",
      displayName: "U",
      accountId: "1",
      gender: "male",
      ageRange: null,
      languages: [],
      location: null,
      interests: [{ name: "X", noEvidence: false }],
      totalInterests: 1,
      shows: [],
      numAudiences: 0,
      numLookalikes: 0,
    });
    expect(withFlag.specificity).toBeGreaterThan(without.specificity);
  });

  it("magnitude scales with totalInterests and audience count", () => {
    const small = computeDossierShareability({
      username: "u",
      displayName: "U",
      accountId: "1",
      gender: "male",
      ageRange: null,
      languages: [],
      location: null,
      interests: [],
      totalInterests: 5,
      shows: [],
      numAudiences: 1,
      numLookalikes: 0,
    });
    const big = computeDossierShareability({
      username: "u",
      displayName: "U",
      accountId: "1",
      gender: "male",
      ageRange: null,
      languages: [],
      location: null,
      interests: [],
      totalInterests: 200,
      shows: [],
      numAudiences: 50,
      numLookalikes: 0,
    });
    expect(big.magnitude).toBeGreaterThan(small.magnitude);
  });

  it("uniqueness is constant at 80", () => {
    expect(
      computeDossierShareability({
        username: "u",
        displayName: "U",
        accountId: "1",
        gender: null,
        ageRange: null,
        languages: [],
        location: null,
        interests: [],
        totalInterests: 0,
        shows: [],
        numAudiences: 0,
        numLookalikes: 0,
      }).uniqueness,
    ).toBe(80);
  });
});
