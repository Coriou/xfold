import type { ShareCardModule } from "../../types";
import { ZombieCard } from "./card";
import {
  computeZombie,
  computeZombieShareability,
  type ZombieCardProps,
} from "./compute";

export const zombieInterestsCard: ShareCardModule<ZombieCardProps> = {
  meta: {
    id: "zombie-interests",
    title: "Zombie Interest",
    tagline: "You turned it off — X kept selling it",
    category: "ads",
    slug: "zombie-interest",
  },
  compute: computeZombie,
  shareabilityScore: computeZombieShareability,
  Component: ZombieCard,
};
