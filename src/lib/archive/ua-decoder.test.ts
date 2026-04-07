import { describe, expect, it } from "vitest";
import { decodeUserAgent } from "@/lib/archive/ua-decoder";

describe("decodeUserAgent", () => {
  it("returns Unknown family for empty input", () => {
    const r = decodeUserAgent("");
    expect(r.family).toBe("Unknown");
    expect(r.model).toBeNull();
    expect(r.os).toBeNull();
    expect(r.browser).toBeNull();
    expect(r.year).toBeNull();
  });

  it("decodes Twitter native iPhone UA with model code", () => {
    const r = decodeUserAgent(
      "Twitter-iPhone/9.58.1 iOS/16.4.1 (Apple;iPhone11,2;;;;;1;2018)",
    );
    expect(r.family).toBe("iPhone");
    expect(r.model).toBe("iPhone XS");
    expect(r.os).toBe("iOS 16.4.1");
    expect(r.browser).toBe("Twitter for iPhone 9.58.1");
    expect(r.year).toBe(2018);
  });

  it("decodes Twitter native UA with unknown model code (falls back to family only)", () => {
    const r = decodeUserAgent(
      "Twitter-iPhone/10.0 iOS/17.0 (Apple;iPhone99,99;;;;;1;)",
    );
    expect(r.family).toBe("iPhone");
    expect(r.model).toBeNull();
    expect(r.os).toBe("iOS 17.0");
    expect(r.year).toBeNull();
  });

  it("uses bundled year when UA omits the trailing year field", () => {
    const r = decodeUserAgent(
      "Twitter-iPhone/9.5 iOS/16.0 (Apple;iPhone13,3;;;;;1;)",
    );
    expect(r.model).toBe("iPhone 12 Pro");
    expect(r.year).toBe(2020);
  });

  it("handles Twitter native iPad UA", () => {
    const r = decodeUserAgent(
      "Twitter-iPad/9.5 iOS/16.0 (Apple;iPad8,1;;;;;1;2018)",
    );
    expect(r.family).toBe("iPad");
    expect(r.model).toBe('iPad Pro 11"');
    expect(r.year).toBe(2018);
  });

  it("decodes standard mobile Safari iPhone UA", () => {
    const r = decodeUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.1 Mobile/15E148 Safari/604.1",
    );
    expect(r.family).toBe("iPhone");
    expect(r.os).toBe("iOS 16.5.1");
    expect(r.browser).toBe("Safari 16");
    // Standard browser UAs don't carry model codes — model stays null.
    expect(r.model).toBeNull();
  });

  it("decodes desktop macOS Chrome UA", () => {
    const r = decodeUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    expect(r.family).toBe("Mac");
    expect(r.os).toBe("macOS 10.15.7");
    expect(r.browser).toBe("Chrome 120");
  });

  it("decodes Edge over Chrome (Edge UAs contain Chrome too)", () => {
    const r = decodeUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    );
    expect(r.family).toBe("Windows");
    expect(r.os).toBe("Windows 10/11");
    expect(r.browser).toBe("Edge 120");
  });

  it("decodes Firefox on Linux", () => {
    const r = decodeUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
    );
    expect(r.family).toBe("Linux");
    expect(r.os).toBe("Linux");
    expect(r.browser).toBe("Firefox 120");
  });

  it("decodes Chrome on Android", () => {
    const r = decodeUserAgent(
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    );
    expect(r.family).toBe("Android");
    expect(r.os).toBe("Android 13");
    expect(r.browser).toBe("Chrome 120");
  });

  it("recognizes older Windows NT versions", () => {
    expect(
      decodeUserAgent("Mozilla/5.0 (Windows NT 6.1) Firefox/100").os,
    ).toBe("Windows 7");
    expect(
      decodeUserAgent("Mozilla/5.0 (Windows NT 6.3) Firefox/100").os,
    ).toBe("Windows 8.1");
    expect(
      decodeUserAgent("Mozilla/5.0 (Windows NT 6.2) Firefox/100").os,
    ).toBe("Windows 8");
  });

  it("returns the raw UA verbatim", () => {
    const ua = "Mozilla/5.0 weird thing";
    expect(decodeUserAgent(ua).raw).toBe(ua);
  });

  it("falls back gracefully for completely unrecognized UAs", () => {
    const r = decodeUserAgent("definitely-not-a-real-ua");
    expect(r.family).toBe("Unknown");
    expect(r.os).toBeNull();
    expect(r.browser).toBeNull();
  });

  it("decodes the Twitter native UA shape with no app version present (graceful)", () => {
    // Even malformed Twitter-prefixed UAs should at least pick up family.
    const r = decodeUserAgent("Twitter-Android/ Android/13 (Google;Pixel;;;;;1;)");
    expect(r.family).toBe("Android");
  });

  it("handles iPhone XR (iPhone11,8) — the canonical Ben archive case", () => {
    const r = decodeUserAgent(
      "Twitter-iPhone/9.5 iOS/16.0 (Apple;iPhone11,8;;;;;1;2018)",
    );
    expect(r.model).toBe("iPhone XR");
    expect(r.year).toBe(2018);
  });
});
