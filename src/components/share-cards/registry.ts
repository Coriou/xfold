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
import { firstAndLastCard } from "./cards/first-and-last";
import { advertiserWallCard } from "./cards/advertiser-wall";
import { offTwitterCard } from "./cards/off-twitter";
import { identityTimelineCard } from "./cards/identity-timeline";
import { scoreCard } from "./cards/score";
import { askedGrokCard } from "./cards/asked-grok";
import { doorsOpenCard } from "./cards/doors-open";
import { dossierCard } from "./cards/dossier";
import { deletedTweetsCard } from "./cards/deleted-tweets";
import { ghostDataCard } from "./cards/ghost-data";
import { contactsCard } from "./cards/contacts-card";
import { pipelineCard } from "./cards/pipeline";
import { xguessesCard } from "./cards/xguesses";
import { dataBetrayalCard } from "./cards/data-betrayal";

export const SHARE_CARDS: readonly RegisteredShareCard[] = [
  defineShareCard(deletedTweetsCard),
  defineShareCard(dataBetrayalCard),
  defineShareCard(ghostDataCard),
  defineShareCard(contactsCard),
  defineShareCard(receiptCard),
  defineShareCard(pipelineCard),
  defineShareCard(xguessesCard),
  defineShareCard(wrappedCard),
  defineShareCard(askedGrokCard),
  defineShareCard(dossierCard),
  defineShareCard(doorsOpenCard),
  defineShareCard(firstAndLastCard),
  defineShareCard(advertiserWallCard),
  defineShareCard(offTwitterCard),
  defineShareCard(identityTimelineCard),
  defineShareCard(scoreCard),
];
