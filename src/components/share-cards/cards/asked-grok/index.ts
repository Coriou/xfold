import type { ShareCardModule } from "../../types";
import { AskedGrokCard } from "./card";
import {
  computeAskedGrok,
  computeAskedGrokShareability,
  type AskedGrokCardProps,
} from "./compute";

export const askedGrokCard: ShareCardModule<AskedGrokCardProps> = {
  meta: {
    id: "asked-grok",
    title: "What I Asked Grok",
    tagline: "The AI prompts X retained forever",
    category: "headline",
    slug: "asked-grok",
  },
  compute: computeAskedGrok,
  shareabilityScore: computeAskedGrokShareability,
  Component: AskedGrokCard,
};
