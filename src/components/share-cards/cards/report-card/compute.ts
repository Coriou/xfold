// ---------------------------------------------------------------------------
// Report Card share card — compute
// ---------------------------------------------------------------------------
//
// A multi-category "report card" view of the user's X exposure. Shows
// category grades with bar fills, specific alarming findings, and a
// headline sentence. This is *the* comprehensive share card — designed
// to tell a complete story at a glance with enough specifics to be credible.
// ---------------------------------------------------------------------------

import { buildRelatableUnits } from "@/lib/archive/insights/relatable-units";
import { buildShadowProfile } from "@/lib/archive/insights/shadow-profile";
import type { ComputeContext, ShareabilityScore } from "../../types";

export interface ReportCardLine {
  readonly label: string;
  readonly grade: string;
  readonly score: number;
}

export interface ReportCardFinding {
  readonly icon: string;
  readonly text: string;
  readonly severity: "low" | "medium" | "high";
}

export interface ReportCardProps {
  readonly username: string;
  readonly overall: number;
  readonly grade: string;
  readonly categories: readonly ReportCardLine[];
  readonly findings: readonly ReportCardFinding[];
  /** One-sentence hook — the most visceral relatable stat. */
  readonly hookSentence: string;
}

export function computeReportCard(ctx: ComputeContext): ReportCardProps | null {
  const { archive, score } = ctx;

  // Build category lines from privacy score
  const categories: ReportCardLine[] = score.categories
    .slice(0, 5)
    .map((cat) => ({
      label: cat.label,
      grade: cat.grade,
      score: cat.score,
    }));

  if (categories.length === 0) return null;

  // Build findings from multiple insight sources
  const findings: ReportCardFinding[] = [];

  // Advertiser count
  const advSet = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) advSet.add(imp.advertiserScreenName);
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) advSet.add(eng.advertiserScreenName);
  }
  if (advSet.size > 0) {
    findings.push({
      icon: "\uD83D\uDD34",
      text: `${advSet.size.toLocaleString("en-US")} advertisers targeted you`,
      severity:
        advSet.size > 200 ? "high" : advSet.size > 50 ? "medium" : "low",
    });
  }

  // Deleted tweets
  if (archive.deletedTweets.length > 0) {
    findings.push({
      icon: "\uD83D\uDD34",
      text: `X kept ${archive.deletedTweets.length.toLocaleString("en-US")} deleted tweets`,
      severity:
        archive.deletedTweets.length > 100
          ? "high"
          : archive.deletedTweets.length > 20
            ? "medium"
            : "low",
    });
  }

  // Shadow profile ratio
  const shadow = buildShadowProfile(archive);
  if (shadow.inferredRatio > 1) {
    findings.push({
      icon: "\uD83D\uDFE1",
      text: `${shadow.inferredRatio}× more data inferred than you shared`,
      severity:
        shadow.inferredRatio > 5
          ? "high"
          : shadow.inferredRatio > 2
            ? "medium"
            : "low",
    });
  }

  // Connected apps with write access
  const writeApps = archive.connectedApps.filter((a) =>
    a.permissions.some(
      (p) =>
        p.toLowerCase().includes("write") || p.toLowerCase().includes("post"),
    ),
  );
  if (writeApps.length > 0) {
    findings.push({
      icon: "\uD83D\uDFE1",
      text: `${writeApps.length} apps have write access`,
      severity: writeApps.length > 5 ? "high" : "medium",
    });
  }

  // Uploaded contacts
  if (archive.contacts.length > 0) {
    findings.push({
      icon: "\uD83D\uDD34",
      text: `${archive.contacts.length.toLocaleString("en-US")} contacts uploaded from your phone`,
      severity: archive.contacts.length > 100 ? "high" : "medium",
    });
  }

  // Pick the most visceral relatable unit as the hook sentence
  const units = buildRelatableUnits(archive);
  const hookSentence = units[0]?.sentence ?? score.headline;

  return {
    username: archive.meta.username,
    overall: score.overall,
    grade: score.grade,
    categories: categories.slice(0, 5),
    findings: findings.slice(0, 4),
    hookSentence,
  };
}

export function computeReportCardShareability(
  props: ReportCardProps,
): ShareabilityScore {
  // Report card is always highly shareable — it's the comprehensive card
  const findingSeverities = props.findings.filter(
    (f) => f.severity === "high",
  ).length;
  const magnitude = Math.min(100, props.overall);
  const specificity = Math.min(
    100,
    40 + props.findings.length * 10 + findingSeverities * 10,
  );
  const uniqueness = 70; // report-card format itself is unique and differentiating

  return { magnitude, specificity, uniqueness };
}
