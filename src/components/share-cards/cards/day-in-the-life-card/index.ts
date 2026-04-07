import type { ShareCardModule } from "../../types";
import { DayInTheLifeCard } from "./card";
import {
  computeDayInTheLife,
  computeDayInTheLifeShareability,
  type DayInTheLifeCardProps,
} from "./compute";

export const dayInTheLifeCard: ShareCardModule<DayInTheLifeCardProps> = {
  meta: {
    id: "day-in-the-life",
    title: "A Day In The Life",
    tagline: "Your most data-dense day, reconstructed from the archive",
    category: "headline",
    slug: "day-in-the-life",
  },
  compute: computeDayInTheLife,
  shareabilityScore: computeDayInTheLifeShareability,
  Component: DayInTheLifeCard,
};
