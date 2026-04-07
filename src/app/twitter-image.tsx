import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

// ----------------------------------------------------------------------------
// Twitter / X card image
// ----------------------------------------------------------------------------
//
// Twitter's `summary_large_image` card crops to roughly 2:1, but the modern
// X timeline preview also renders nicely at 1.91:1 (the OG default). We
// keep this slightly more square than the OG image so the headline reads
// well even when the bottom is cropped on smaller phone previews.
//
// Same product-preview composition as the OG image, scaled to a wider
// canvas. Single source of truth lives in `opengraph-image.tsx` if you
// need to redesign — keep them visually consistent.
// ----------------------------------------------------------------------------

export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

const TILE_RADIUS = 18;

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: brand.background,
          fontFamily: "system-ui, sans-serif",
          padding: "56px 70px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 56, fontWeight: 800 }}>
            <span style={{ color: brand.foreground }}>x</span>
            <span style={{ color: brand.accent }}>fold</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 18px",
              borderRadius: 999,
              border: `1px solid ${brand.border}`,
              fontSize: 18,
              color: brand.foregroundMuted,
            }}
          >
            xfold.app
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 60,
              fontWeight: 800,
              color: brand.foreground,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            See what X knows
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 60,
              fontWeight: 800,
              color: brand.foreground,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            <span>about&nbsp;</span>
            <span style={{ color: brand.accent }}>you</span>
            <span>.</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: brand.backgroundRaised,
              borderRadius: TILE_RADIUS,
              border: `1px solid ${brand.border}`,
              padding: "22px 26px",
              marginRight: 16,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: brand.foregroundMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Privacy Score
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                marginTop: 8,
              }}
            >
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  color: brand.danger,
                  fontFamily: "monospace",
                  lineHeight: 1,
                }}
              >
                47
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: brand.foregroundMuted,
                  fontFamily: "monospace",
                  marginLeft: 6,
                }}
              >
                /100
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: brand.backgroundRaised,
              borderRadius: TILE_RADIUS,
              border: `1px solid ${brand.border}`,
              padding: "22px 26px",
              marginRight: 16,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: brand.foregroundMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Advertisers
            </div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: brand.foreground,
                fontFamily: "monospace",
                marginTop: 8,
                lineHeight: 1,
              }}
            >
              1,247
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: brand.backgroundRaised,
              borderRadius: TILE_RADIUS,
              border: `1px solid ${brand.border}`,
              padding: "22px 26px",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: brand.foregroundMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Deleted tweets X kept
            </div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: brand.foreground,
                fontFamily: "monospace",
                marginTop: 8,
                lineHeight: 1,
              }}
            >
              847
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "auto",
            paddingTop: 24,
            fontSize: 18,
            color: brand.foregroundMuted,
          }}
        >
          100% client-side · open source · your data never leaves your browser
        </div>
      </div>
    ),
    { ...size },
  );
}
