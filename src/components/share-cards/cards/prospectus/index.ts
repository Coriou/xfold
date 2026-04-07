import type { ShareCardModule } from "../../types";
import { ProspectusCard } from "./card";
import {
  computeProspectus,
  computeProspectusShareability,
  type ProspectusCardProps,
} from "./compute";

export const prospectusCard: ShareCardModule<ProspectusCardProps> = {
  meta: {
    id: "prospectus",
    title: "X's Sales Pitch",
    tagline: "The product listing X writes about you for advertisers",
    category: "ads",
    slug: "sales-pitch",
  },
  compute: computeProspectus,
  shareabilityScore: computeProspectusShareability,
  Component: ProspectusCard,
};
