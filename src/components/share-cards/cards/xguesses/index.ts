import type { ShareCardModule } from "../../types";
import { XGuessesCard } from "./card";
import {
  computeXGuesses,
  computeXGuessesShareability,
  type XGuessesCardProps,
} from "./compute";

export const xguessesCard: ShareCardModule<XGuessesCardProps> = {
  meta: {
    id: "xguesses",
    title: "X's Guesses",
    tagline: "Interests X assigned without evidence from your posts",
    category: "ads",
    slug: "xguesses",
  },
  compute: computeXGuesses,
  shareabilityScore: computeXGuessesShareability,
  Component: XGuessesCard,
};
