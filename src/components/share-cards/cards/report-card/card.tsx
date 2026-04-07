import { brand } from "@/lib/brand";
import { CardFooter, CardFrame, CardHeader } from "../../_primitives";
import type {
  ReportCardFinding,
  ReportCardLine,
  ReportCardProps,
} from "./compute";

export function ReportCard(props: ReportCardProps) {
  return (
    <CardFrame>
      <CardHeader title="Report Card" />

      {/* Grade hero */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 20,
            backgroundColor: gradeColor(props.grade),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            fontWeight: 700,
            color: brand.background,
            fontFamily: "monospace",
          }}
        >
          {props.grade}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              color: brand.foregroundMuted,
              letterSpacing: 2,
              fontFamily: "monospace",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            X Exposure Score
          </div>
          <div
            style={{
              fontSize: 18,
              color: brand.foreground,
              lineHeight: 1.4,
            }}
          >
            {props.hookSentence}
          </div>
        </div>
      </div>

      {/* Category bars */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 24,
          padding: "20px 24px",
          backgroundColor: brand.backgroundRaised,
          borderRadius: 16,
        }}
      >
        {props.categories.map((cat, i) => (
          <CategoryBar key={i} line={cat} />
        ))}
      </div>

      {/* Findings */}
      {props.findings.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {props.findings.map((f, i) => (
            <FindingRow key={i} finding={f} />
          ))}
        </div>
      )}

      <CardFooter username={props.username} />
    </CardFrame>
  );
}

function CategoryBar({ line }: { line: ReportCardLine }) {
  const color = gradeColor(line.grade);
  const fillWidth = Math.max(4, Math.min(100, line.score));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 140,
          fontSize: 14,
          color: brand.foregroundMuted,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {line.label}
      </div>
      <div
        style={{
          flex: 1,
          height: 16,
          backgroundColor: brand.background,
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${fillWidth}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 8,
          }}
        />
      </div>
      <div
        style={{
          width: 28,
          fontSize: 16,
          fontWeight: 700,
          fontFamily: "monospace",
          color,
          textAlign: "right",
        }}
      >
        {line.grade}
      </div>
    </div>
  );
}

function FindingRow({ finding }: { finding: ReportCardFinding }) {
  const color =
    finding.severity === "high"
      ? brand.danger
      : finding.severity === "medium"
        ? brand.foreground
        : brand.foregroundMuted;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        backgroundColor: brand.backgroundRaised,
        borderRadius: 10,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span style={{ fontSize: 16 }}>{finding.icon}</span>
      <span
        style={{
          fontSize: 16,
          color: brand.foreground,
          lineHeight: 1.35,
          fontWeight: 500,
        }}
      >
        {finding.text}
      </span>
    </div>
  );
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return brand.accent;
    case "B":
      return brand.accent;
    case "C":
      return brand.foreground;
    case "D":
      return brand.danger;
    case "F":
      return brand.danger;
    default:
      return brand.foregroundMuted;
  }
}
