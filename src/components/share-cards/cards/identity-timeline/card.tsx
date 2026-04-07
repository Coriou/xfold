import { brand } from "@/lib/brand";
import { formatDate } from "@/lib/format";
import {
  CardFooter,
  CardFrame,
  CardHeader,
} from "../../_primitives";
import type { IdentityTimelineCardProps } from "./compute";

export function IdentityTimelineCard(props: IdentityTimelineCardProps) {
  return (
    <CardFrame>
      <CardHeader title="My Handles" />

      <div
        style={{
          textAlign: "center",
          marginTop: 8,
          marginBottom: 32,
          fontSize: 18,
          color: brand.foregroundMuted,
        }}
      >
        Every name I&apos;ve gone by on X
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "0 24px",
        }}
      >
        {props.handles.map((h, i) => {
          const isLatest = i === props.handles.length - 1;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: isLatest ? brand.accent : brand.border,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: isLatest ? brand.accent : brand.foreground,
                    fontFamily: "monospace",
                  }}
                >
                  @{h.handle}
                </div>
                {h.sinceDate && (
                  <div
                    style={{
                      fontSize: 14,
                      color: brand.foregroundMuted,
                      marginTop: 2,
                    }}
                  >
                    since {formatDate(h.sinceDate)}
                  </div>
                )}
                {!h.sinceDate && i === 0 && (
                  <div
                    style={{
                      fontSize: 14,
                      color: brand.foregroundMuted,
                      marginTop: 2,
                    }}
                  >
                    the original
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
