import type { ShareCardModule } from "../../types";
import { DossierCard } from "./card";
import {
  computeDossier,
  computeDossierShareability,
  type DossierCardProps,
} from "./compute";

export const dossierCard: ShareCardModule<DossierCardProps> = {
  meta: {
    id: "dossier",
    title: "Dossier",
    tagline: "What X knows about you, in their own words",
    category: "identity",
    slug: "dossier",
  },
  compute: computeDossier,
  shareabilityScore: computeDossierShareability,
  Component: DossierCard,
};
