// ---------------------------------------------------------------------------
// Share-card registry
// ---------------------------------------------------------------------------
//
// Order = display order in the gallery. Adding a new card is one import +
// one line here. No central modifications anywhere else.
// ---------------------------------------------------------------------------

import { defineShareCard } from "./define-share-card";
import type { RegisteredShareCard } from "./types";

import { receiptCard } from "./cards/receipt";
import { wrappedCard } from "./cards/wrapped";
import { twitterThinksCard } from "./cards/twitter-thinks";
import { firstAndLastCard } from "./cards/first-and-last";
import { advertiserWallCard } from "./cards/advertiser-wall";
import { offTwitterCard } from "./cards/off-twitter";
import { identityTimelineCard } from "./cards/identity-timeline";
import { scoreCard } from "./cards/score";

export const SHARE_CARDS: readonly RegisteredShareCard[] = [
  defineShareCard(receiptCard),
  defineShareCard(wrappedCard),
  defineShareCard(twitterThinksCard),
  defineShareCard(firstAndLastCard),
  defineShareCard(advertiserWallCard),
  defineShareCard(offTwitterCard),
  defineShareCard(identityTimelineCard),
  defineShareCard(scoreCard),
];
