import type { ShareCardModule } from "../../types";
import { DataBetrayalCard } from "./card";
import {
  computeDataBetrayal,
  computeDataBetrayalShareability,
  type DataBetrayalCardProps,
} from "./compute";

export const dataBetrayalCard: ShareCardModule<DataBetrayalCardProps> = {
  meta: {
    id: "data-betrayal",
    title: "Data Betrayal",
    tagline: "How long X kept the tweets you deleted",
    category: "headline",
    slug: "data-betrayal",
  },
  compute: computeDataBetrayal,
  shareabilityScore: computeDataBetrayalShareability,
  Component: DataBetrayalCard,
};
