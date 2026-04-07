import type { ShareCardModule } from "../../types";
import { XErasCard } from "./card";
import {
  computeXEras,
  computeXErasShareability,
  type XErasCardProps,
} from "./compute";

export const xErasCard: ShareCardModule<XErasCardProps> = {
  meta: {
    id: "x-eras",
    title: "Your X Eras",
    tagline: "Your life on X, told in chapters",
    category: "history",
    slug: "x-eras",
  },
  compute: computeXEras,
  shareabilityScore: computeXErasShareability,
  Component: XErasCard,
};
