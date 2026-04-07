import type { ShareCardModule } from "../../types";
import { DeletedTweetsCard } from "./card";
import {
  computeDeletedTweets,
  computeDeletedTweetsShareability,
  type DeletedTweetsCardProps,
} from "./compute";

export const deletedTweetsCard: ShareCardModule<DeletedTweetsCardProps> = {
  meta: {
    id: "deleted-tweets",
    title: "The Deleted",
    tagline: "Tweets you deleted — that X still kept",
    category: "headline",
    slug: "deleted-tweets",
  },
  compute: computeDeletedTweets,
  shareabilityScore: computeDeletedTweetsShareability,
  Component: DeletedTweetsCard,
};
