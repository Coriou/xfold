import type { ShareCardModule } from "../../types";
import { OffTwitterCard } from "./card";
import {
  computeOffTwitter,
  computeOffTwitterShareability,
  type OffTwitterCardProps,
} from "./compute";

export const offTwitterCard: ShareCardModule<OffTwitterCardProps> = {
  meta: {
    id: "off-twitter",
    title: "Off Twitter",
    tagline: "Apps you installed and sites you visited that X tracked",
    category: "ads",
    slug: "off-twitter",
  },
  compute: computeOffTwitter,
  shareabilityScore: computeOffTwitterShareability,
  Component: OffTwitterCard,
};
