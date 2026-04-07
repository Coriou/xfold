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
import { reportCardCard } from "./cards/report-card";
import { algorithmicMirrorCard } from "./cards/algorithmic-mirror";
import { adPriceTagCard } from "./cards/ad-price-tag";
import { zombieInterestsCard } from "./cards/zombie-interests";
import { deletionLieCard } from "./cards/deletion-lie";
import { brokerLabelCard } from "./cards/broker-label";
import { prospectusCard } from "./cards/prospectus";
import { plainEnglishCard } from "./cards/plain-english";
import { surveillanceTimelineCard } from "./cards/surveillance-timeline";
import { xErasCard } from "./cards/x-eras";
import { betrayalStackCard } from "./cards/betrayal-stack";
import { accuracyAuditCard } from "./cards/accuracy-audit";
import { topFindingCard } from "./cards/top-finding";
import { securityAuditCard } from "./cards/security-audit";
import { erosionCard } from "./cards/erosion";
import { benchmarkCard } from "./cards/benchmark";

export const SHARE_CARDS: readonly RegisteredShareCard[] = [
  defineShareCard(topFindingCard),
  defineShareCard(plainEnglishCard),
  defineShareCard(betrayalStackCard),
  defineShareCard(accuracyAuditCard),
  defineShareCard(surveillanceTimelineCard),
  defineShareCard(xErasCard),
  defineShareCard(algorithmicMirrorCard),
  defineShareCard(adPriceTagCard),
  defineShareCard(deletedTweetsCard),
  defineShareCard(dataBetrayalCard),
  defineShareCard(ghostDataCard),
  defineShareCard(contactsCard),
  defineShareCard(receiptCard),
  defineShareCard(pipelineCard),
  defineShareCard(zombieInterestsCard),
  defineShareCard(deletionLieCard),
  defineShareCard(brokerLabelCard),
  defineShareCard(prospectusCard),
  defineShareCard(xguessesCard),
  defineShareCard(wrappedCard),
  defineShareCard(askedGrokCard),
  defineShareCard(dossierCard),
  defineShareCard(doorsOpenCard),
  defineShareCard(firstAndLastCard),
  defineShareCard(advertiserWallCard),
  defineShareCard(offTwitterCard),
  defineShareCard(identityTimelineCard),
  defineShareCard(securityAuditCard),
  defineShareCard(erosionCard),
  defineShareCard(benchmarkCard),
  defineShareCard(reportCardCard),
  defineShareCard(scoreCard),
];
