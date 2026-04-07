import type { ShareCardModule } from "../../types";
import { SurveillanceTimelineCard } from "./card";
import {
  computeSurveillanceTimeline,
  computeSurveillanceTimelineShareability,
  type SurveillanceTimelineCardProps,
} from "./compute";

export const surveillanceTimelineCard: ShareCardModule<SurveillanceTimelineCardProps> =
  {
    meta: {
      id: "surveillance-timeline",
      title: "Surveillance Timeline",
      tagline: "When X started watching — milestone by milestone",
      category: "headline",
      slug: "surveillance-timeline",
    },
    compute: computeSurveillanceTimeline,
    shareabilityScore: computeSurveillanceTimelineShareability,
    Component: SurveillanceTimelineCard,
  };
