import { brand } from "@/lib/brand";
import { formatDate, pluralize } from "@/lib/format";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type { DoorsOpenAppEntry, DoorsOpenCardProps } from "./compute";

export function DoorsOpenCard(props: DoorsOpenCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Doors Still Open" />

      <div
        style={{
          textAlign: "center",
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            fontFamily: "monospace",
            color: brand.danger,
            lineHeight: 1,
          }}
        >
          {props.writeAppCount}
        </div>
        <div
          style={{
            fontSize: 22,
            color: brand.foreground,
            marginTop: 14,
          }}
        >
          apps still have write access to your account
        </div>
        <div
          style={{
            fontSize: 16,
            color: brand.foregroundMuted,
            marginTop: 4,
          }}
        >
          The oldest was approved {pluralize(props.oldestYearsAgo, "year")} ago
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "0 8px",
        }}
      >
        {props.entries.map((entry, i) => (
          <AppRow key={i} entry={entry} />
        ))}
      </div>

      <CardFooter username={props.username} />
    </CardFrame>
  );
}

function AppRow({ entry }: { entry: DoorsOpenAppEntry }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: brand.backgroundRaised,
        borderRadius: 12,
        padding: "16px 22px",
        borderLeft: `4px solid ${brand.danger}`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: brand.foreground,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.name}
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: brand.danger,
              fontWeight: 600,
              fontFamily: "monospace",
            }}
          >
            WRITE
          </span>
          {entry.hasDmAccess && (
            <span
              style={{
                fontSize: 13,
                color: brand.danger,
                fontWeight: 600,
                fontFamily: "monospace",
              }}
            >
              DM
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          fontSize: 16,
          color: brand.foregroundMuted,
          fontFamily: "monospace",
          marginLeft: 16,
          whiteSpace: "nowrap",
        }}
      >
        {formatDate(entry.approvedAt)}
      </div>
    </div>
  );
}
