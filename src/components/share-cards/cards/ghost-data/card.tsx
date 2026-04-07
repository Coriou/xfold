import { brand } from "@/lib/brand";
import {
  BigNumber,
  CardFooter,
  CardFrame,
  CardHeader,
} from "../../_primitives";
import type { GhostDataCardProps } from "./compute";

export function GhostDataCard(props: GhostDataCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Ghost Data" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <BigNumber
          value={props.categoryCount.toString()}
          color={brand.danger}
        />
        <div
          style={{
            fontSize: 26,
            color: brand.foreground,
            marginTop: 20,
            fontWeight: 600,
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          categories of data X hid from their own viewer
        </div>

        {/* Checklist of ghost data categories */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 32,
            padding: "0 40px",
            width: "100%",
          }}
        >
          {props.topLabels.map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 18,
                color: brand.foregroundMuted,
              }}
            >
              <span style={{ color: brand.danger, fontSize: 14 }}>■</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Punchline */}
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            textAlign: "center",
            marginTop: "auto",
            lineHeight: 1.5,
            padding: "0 32px",
          }}
        >
          X gave you a data viewer. They just hid the data worth viewing.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
