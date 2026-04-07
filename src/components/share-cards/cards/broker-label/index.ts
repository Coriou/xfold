import type { ShareCardModule } from "../../types";
import { BrokerCard } from "./card";
import {
  computeBroker,
  computeBrokerShareability,
  type BrokerCardProps,
} from "./compute";

export const brokerLabelCard: ShareCardModule<BrokerCardProps> = {
  meta: {
    id: "broker-label",
    title: "Data Broker Label",
    tagline: "A stranger described you to X — and X believed them",
    category: "ads",
    slug: "broker-label",
  },
  compute: computeBroker,
  shareabilityScore: computeBrokerShareability,
  Component: BrokerCard,
};
