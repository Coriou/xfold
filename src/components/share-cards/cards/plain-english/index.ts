import type { ShareCardModule } from "../../types";
import { PlainEnglishCard } from "./card";
import {
  computePlainEnglish,
  computePlainEnglishShareability,
  type PlainEnglishCardProps,
} from "./compute";

export const plainEnglishCard: ShareCardModule<PlainEnglishCardProps> = {
  meta: {
    id: "plain-english",
    title: "What X Knows",
    tagline: "Your privacy exposure, in plain English",
    category: "headline",
    slug: "what-x-knows",
  },
  compute: computePlainEnglish,
  shareabilityScore: computePlainEnglishShareability,
  Component: PlainEnglishCard,
};
