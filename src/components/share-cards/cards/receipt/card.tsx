import { brand } from "@/lib/brand";
import {
  BigNumber,
  CardFooter,
  CardFrame,
  CardHeader,
} from "../../_primitives";
import type { ReceiptCardProps } from "./compute";

export function ReceiptCard(props: ReceiptCardProps) {
  return (
    <CardFrame>
      <CardHeader title="The Receipt" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <BigNumber value={props.value} color={brand.danger} />
        <div
          style={{
            fontSize: 28,
            color: brand.foreground,
            marginTop: 24,
            fontWeight: 600,
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          {props.label}
        </div>
        <div
          style={{
            fontSize: 18,
            color: brand.foregroundMuted,
            marginTop: 16,
            textAlign: "center",
            padding: "0 32px",
          }}
        >
          {props.contextLine}
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
