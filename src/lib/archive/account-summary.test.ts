import { describe, expect, it } from "vitest";
import {
  getDeviceBreakdown,
  getReferenceDate,
  getYearsOnX,
} from "@/lib/archive/account-summary";
import {
  buildSyntheticArchive,
  syntheticAccount,
  syntheticDeviceToken,
} from "@/lib/archive/__fixtures/synthetic-archive";
import type { KeyRegistryDevice, NiDevice } from "@/lib/archive/types";

function pushDevice(): NiDevice {
  return {
    type: "push",
    deviceType: "iPhone",
    createdDate: "2024-01-01T00:00:00.000Z",
    updatedDate: null,
    udid: "fake-udid",
    carrier: null,
    phoneNumber: null,
  };
}

function encryptionKey(): KeyRegistryDevice {
  return {
    userAgent: "Mozilla/5.0",
    deviceId: "fake-device",
    createdAt: "2024-06-01T00:00:00.000Z",
  };
}

describe("getReferenceDate", () => {
  it("uses the archive generation date when present and parseable", () => {
    const archive = buildSyntheticArchive();
    // Synthetic fixture sets generation date to 2026-04-02
    expect(getReferenceDate(archive).toISOString()).toBe(
      "2026-04-02T00:00:00.000Z",
    );
  });

  it("falls back to now() when the generation date is unparseable", () => {
    const archive = buildSyntheticArchive({
      meta: {
        generationDate: "garbage",
        sizeBytes: 0,
        isPartialArchive: false,
        accountId: "0",
        username: "u",
        displayName: "u",
      },
    });
    const ref = getReferenceDate(archive);
    expect(Math.abs(ref.getTime() - Date.now())).toBeLessThan(2000);
  });
});

describe("getYearsOnX", () => {
  it("returns null when account is missing", () => {
    expect(getYearsOnX(buildSyntheticArchive())).toBeNull();
  });

  it("rounds years between account creation and the reference date", () => {
    // Account created 5 years before the synthetic generation date
    const archive = buildSyntheticArchive({
      account: syntheticAccount({
        createdAt: "2021-04-02T00:00:00.000Z", // exactly 5 years before
      }),
    });
    expect(getYearsOnX(archive)).toBe(5);
  });

  it("rounds 16.81 years to 17", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({
        createdAt: "2009-06-13T00:00:00.000Z",
      }),
    });
    // generation = 2026-04-02, created = 2009-06-13 → ~16.81 years → round = 17
    expect(getYearsOnX(archive)).toBe(17);
  });

  it("returns 0 when account creation is after the reference date", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({
        createdAt: "2099-01-01T00:00:00.000Z",
      }),
    });
    expect(getYearsOnX(archive)).toBe(0);
  });
});

describe("getDeviceBreakdown", () => {
  it("returns zero counts for an empty archive", () => {
    const breakdown = getDeviceBreakdown(buildSyntheticArchive());
    expect(breakdown).toEqual({
      appTokens: 0,
      pushDevices: 0,
      encryptionKeys: 0,
      total: 0,
    });
  });

  it("differentiates the three identifier categories", () => {
    const archive = buildSyntheticArchive({
      deviceTokens: [syntheticDeviceToken(), syntheticDeviceToken()],
      niDevices: [pushDevice(), pushDevice(), pushDevice()],
      keyRegistryDevices: [encryptionKey()],
    });
    expect(getDeviceBreakdown(archive)).toEqual({
      appTokens: 2,
      pushDevices: 3,
      encryptionKeys: 1,
      total: 6,
    });
  });
});
