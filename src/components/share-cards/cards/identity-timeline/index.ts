import type { ShareCardModule } from "../../types";
import { IdentityTimelineCard } from "./card";
import {
  computeIdentityTimeline,
  computeIdentityTimelineShareability,
  type IdentityTimelineCardProps,
} from "./compute";

export const identityTimelineCard: ShareCardModule<IdentityTimelineCardProps> = {
  meta: {
    id: "identity-timeline",
    title: "My Handles",
    tagline: "Every name you've gone by on X",
    category: "identity",
    slug: "identity-timeline",
  },
  compute: computeIdentityTimeline,
  shareabilityScore: computeIdentityTimelineShareability,
  Component: IdentityTimelineCard,
};
