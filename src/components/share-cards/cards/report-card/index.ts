import type { ShareCardModule } from "../../types";
import { ReportCard } from "./card";
import {
  computeReportCard,
  computeReportCardShareability,
  type ReportCardProps,
} from "./compute";

export const reportCardCard: ShareCardModule<ReportCardProps> = {
  meta: {
    id: "report-card",
    title: "Report Card",
    tagline: "Your X exposure grade across every category",
    category: "score",
    slug: "report-card",
  },
  compute: computeReportCard,
  shareabilityScore: computeReportCardShareability,
  Component: ReportCard,
};
