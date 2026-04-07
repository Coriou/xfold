import type { ShareCardModule } from "../../types";
import { DoorsOpenCard } from "./card";
import {
  computeDoorsOpen,
  computeDoorsOpenShareability,
  type DoorsOpenCardProps,
} from "./compute";

export const doorsOpenCard: ShareCardModule<DoorsOpenCardProps> = {
  meta: {
    id: "doors-open",
    title: "Doors Still Open",
    tagline: "Connected apps that still have access to your account",
    category: "history",
    slug: "doors-open",
  },
  compute: computeDoorsOpen,
  shareabilityScore: computeDoorsOpenShareability,
  Component: DoorsOpenCard,
};
