import { brand } from "@/lib/brand";
import {
  BigNumber,
  CardFooter,
  CardFrame,
  CardHeader,
} from "../../_primitives";
import type { ContactsCardProps } from "./compute";

export function ContactsCard(props: ContactsCardProps) {
  return (
    <CardFrame>
      <CardHeader title="The Contacts" />

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
          value={props.contactCount.toLocaleString("en-US")}
          color={brand.danger}
        />
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
          contacts you gave X from your phone
        </div>

        {/* Breakdown */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 32,
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                fontFamily: "monospace",
                color: brand.foreground,
              }}
            >
              {props.emailCount.toLocaleString("en-US")}
            </div>
            <div
              style={{
                fontSize: 16,
                color: brand.foregroundMuted,
                marginTop: 4,
              }}
            >
              email addresses
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                fontFamily: "monospace",
                color: brand.foreground,
              }}
            >
              {props.phoneCount.toLocaleString("en-US")}
            </div>
            <div
              style={{
                fontSize: 16,
                color: brand.foregroundMuted,
                marginTop: 4,
              }}
            >
              phone numbers
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            marginTop: 24,
            textAlign: "center",
            padding: "0 40px",
          }}
        >
          from people who never consented to X having their data.
        </div>
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}
