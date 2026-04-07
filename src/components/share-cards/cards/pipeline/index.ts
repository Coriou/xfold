import type { ShareCardModule } from "../../types";
import { PipelineCard } from "./card";
import {
  computePipeline,
  computePipelineShareability,
  type PipelineCardProps,
} from "./compute";

export const pipelineCard: ShareCardModule<PipelineCardProps> = {
  meta: {
    id: "pipeline",
    title: "The Pipeline",
    tagline: "How X turned a guess about you into ad revenue",
    category: "ads",
    slug: "pipeline",
  },
  compute: computePipeline,
  shareabilityScore: computePipelineShareability,
  Component: PipelineCard,
};
