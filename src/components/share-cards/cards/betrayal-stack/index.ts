import type { ShareCardModule } from "../../types";
import { BetrayalStackCard } from "./card";
import {
  computeBetrayalStack,
  computeBetrayalStackShareability,
  type BetrayalStackCardProps,
} from "./compute";

export const betrayalStackCard: ShareCardModule<BetrayalStackCardProps> = {
  meta: {
    id: "betrayal-stack",
    title: "Broken Promises",
    tagline: "When X's privacy controls didn't work",
    category: "headline",
    slug: "broken-promises",
  },
  compute: computeBetrayalStack,
  shareabilityScore: computeBetrayalStackShareability,
  Component: BetrayalStackCard,
};
