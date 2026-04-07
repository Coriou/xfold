import { brand } from "@/lib/brand";
import {
  CardFooter,
  CardFrame,
  CardHeader,
} from "../../_primitives";
import type { OffTwitterCardProps } from "./compute";

export function OffTwitterCard(props: OffTwitterCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Off Twitter" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: 32,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 22,
              color: brand.foregroundMuted,
              marginBottom: 16,
            }}
          >
            X also knows about
          </div>
          <div
            style={{
              display: "flex",
              gap: 48,
              justifyContent: "center",
            }}
          >
            <Stat value={props.installs} label="app installs" />
            <Stat value={props.sites} label="websites visited" />
            <Stat value={props.apps} label="inferred apps" />
          </div>
        </div>

        <div
          style={{
            fontSize: 18,
            color: brand.foregroundMuted,
            textAlign: "center",
            padding: "0 32px",
            maxWidth: 720,
          }}
        >
          Twitter ships this data in your archive but doesn&apos;t show it in
          the official viewer.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          fontFamily: "monospace",
          color: brand.danger,
          lineHeight: 1,
        }}
      >
        {value.toLocaleString("en-US")}
      </div>
      <div
        style={{
          fontSize: 16,
          color: brand.foregroundMuted,
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
}
