import type { ShareCardModule } from "../../types";
import { AlgorithmicMirrorCard } from "./card";
import {
  computeAlgorithmicMirror,
  computeAlgorithmicMirrorShareability,
  type AlgorithmicMirrorCardProps,
} from "./compute";

export const algorithmicMirrorCard: ShareCardModule<AlgorithmicMirrorCardProps> =
  {
    meta: {
      id: "algorithmic-mirror",
      title: "X Thinks You Are…",
      tagline: "The algorithmic portrait X built from your data",
      category: "identity",
      slug: "algorithmic-mirror",
    },
    compute: computeAlgorithmicMirror,
    shareabilityScore: computeAlgorithmicMirrorShareability,
    Component: AlgorithmicMirrorCard,
  };
