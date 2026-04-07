// ---------------------------------------------------------------------------
// Ghost Data — surfaces data categories X has but hides from their own viewer
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "../types";

export interface GhostDataCategory {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Short summary for the share card (e.g. "847 deleted tweets") */
  readonly headline: string;
  readonly count: number;
  readonly severity: "info" | "warning" | "critical";
  /** Section ID to navigate to for details, if one exists */
  readonly sectionId: string | null;
}

/**
 * Scans the archive for data categories that X's official HTML viewer
 * (`Your archive.html`) does NOT display. Returns categories with nonzero
 * data, sorted by severity (critical first).
 */
export function detectGhostData(archive: ParsedArchive): GhostDataCategory[] {
  const candidates: GhostDataCategory[] = [];

  // Deleted tweets
  const deletedTweets = archive.deletedTweets;
  if (deletedTweets.length > 0) {
    candidates.push({
      id: "deleted-tweets",
      label: "Deleted Tweets",
      description: `You deleted ${deletedTweets.length.toLocaleString()} tweets. X still has them.`,
      headline: `${deletedTweets.length.toLocaleString()} deleted tweets kept`,
      count: deletedTweets.length,
      severity: "critical",
      sectionId: "deleted-tweets",
    });
  }

  // Uploaded contacts
  const contacts = archive.contacts;
  if (contacts.length > 0) {
    candidates.push({
      id: "contacts",
      label: "Uploaded Contacts",
      description: `X has ${contacts.length.toLocaleString()} contacts from your phone's address book — people who never consented.`,
      headline: `${contacts.length.toLocaleString()} contacts from your phone`,
      count: contacts.length,
      severity: "critical",
      sectionId: "contacts",
    });
  }

  // Off-twitter conversion tracking
  const offTwitterTotal =
    archive.offTwitter.mobileConversionsAttributed.length +
    archive.offTwitter.mobileConversionsUnattributed.length +
    archive.offTwitter.onlineConversionsAttributed.length +
    archive.offTwitter.onlineConversionsUnattributed.length;
  if (offTwitterTotal > 0) {
    candidates.push({
      id: "off-twitter-conversions",
      label: "Off-Platform Tracking",
      description: `X tracked ${offTwitterTotal.toLocaleString()} conversion events from apps and websites you used outside Twitter.`,
      headline: `${offTwitterTotal.toLocaleString()} off-platform tracking events`,
      count: offTwitterTotal,
      severity: "critical",
      sectionId: "off-twitter",
    });
  }

  // Inferred apps
  if (archive.offTwitter.inferredApps.length > 0) {
    candidates.push({
      id: "inferred-apps",
      label: "Inferred App List",
      description: `X inferred you have ${archive.offTwitter.inferredApps.length.toLocaleString()} apps installed on your devices.`,
      headline: `${archive.offTwitter.inferredApps.length.toLocaleString()} apps X thinks you have`,
      count: archive.offTwitter.inferredApps.length,
      severity: "warning",
      sectionId: "off-twitter",
    });
  }

  // Device fingerprints (key registry + NI devices)
  const deviceFingerprints =
    archive.keyRegistryDevices.length + archive.niDevices.length;
  if (deviceFingerprints > 0) {
    candidates.push({
      id: "device-fingerprints",
      label: "Device Fingerprints",
      description: `X fingerprinted ${deviceFingerprints.toLocaleString()} of your devices using user agents, UDIDs, and push tokens.`,
      headline: `${deviceFingerprints.toLocaleString()} device fingerprints`,
      count: deviceFingerprints,
      severity: "warning",
      sectionId: "devices",
    });
  }

  // Inferred location history
  const locationHistory = archive.personalization?.locationHistory ?? [];
  if (locationHistory.length > 0) {
    candidates.push({
      id: "location-history",
      label: "Inferred Location History",
      description: `X inferred your location ${locationHistory.length.toLocaleString()} times based on your activity.`,
      headline: `${locationHistory.length.toLocaleString()} location inferences`,
      count: locationHistory.length,
      severity: "warning",
      sectionId: null,
    });
  }

  // Muted accounts
  const mutes = archive.mutes;
  if (mutes.length > 0) {
    candidates.push({
      id: "mutes",
      label: "Muted Accounts",
      description: `X has a record of ${mutes.length.toLocaleString()} accounts you muted.`,
      headline: `${mutes.length.toLocaleString()} muted accounts`,
      count: mutes.length,
      severity: "info",
      sectionId: "social-graph",
    });
  }

  // Saved searches
  const savedSearches = archive.savedSearches;
  if (savedSearches.length > 0) {
    candidates.push({
      id: "saved-searches",
      label: "Saved Searches",
      description: `X stored ${savedSearches.length.toLocaleString()} of your saved search queries.`,
      headline: `${savedSearches.length.toLocaleString()} saved searches`,
      count: savedSearches.length,
      severity: "info",
      sectionId: null,
    });
  }

  // Community notes
  const communityNotes = archive.communityNotes;
  const communityNoteRatings = archive.communityNoteRatings;
  if (communityNotes.length > 0 || communityNoteRatings.length > 0) {
    const total = communityNotes.length + communityNoteRatings.length;
    candidates.push({
      id: "community-notes",
      label: "Community Notes Activity",
      description: `X recorded ${total.toLocaleString()} Community Notes actions (${communityNotes.length} notes written, ${communityNoteRatings.length} ratings).`,
      headline: `${total.toLocaleString()} Community Notes actions`,
      count: total,
      severity: "info",
      sectionId: null,
    });
  }

  // Partner interests (third-party data broker data)
  const partnerInterests = archive.personalization?.partnerInterests ?? [];
  if (partnerInterests.length > 0) {
    candidates.push({
      id: "partner-interests",
      label: "Third-Party Broker Data",
      description: `X purchased ${partnerInterests.length.toLocaleString()} interest labels about you from external data brokers.`,
      headline: `${partnerInterests.length.toLocaleString()} data broker labels`,
      count: partnerInterests.length,
      severity: "critical",
      sectionId: "ad-profile",
    });
  }

  // Lookalike audiences
  const lookalikes = archive.personalization?.lookalikeAdvertisers ?? [];
  if (lookalikes.length > 0) {
    candidates.push({
      id: "lookalike-audiences",
      label: "Lookalike Audiences",
      description: `${lookalikes.length.toLocaleString()} advertisers target people who "look like" you — using your behavioral pattern as a template.`,
      headline: `${lookalikes.length.toLocaleString()} lookalike advertisers`,
      count: lookalikes.length,
      severity: "warning",
      sectionId: "demographics",
    });
  }

  // Audience lists
  const audiences = archive.personalization?.numAudiences ?? 0;
  if (audiences > 0) {
    candidates.push({
      id: "audience-lists",
      label: "Advertiser Audience Lists",
      description: `You appear on ${audiences.toLocaleString()} advertiser audience lists — curated databases of users that brands buy and sell.`,
      headline: `on ${audiences.toLocaleString()} audience lists`,
      count: audiences,
      severity: "warning",
      sectionId: "demographics",
    });
  }

  // Sort: critical first, then warning, then info; within same severity by count desc
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return candidates.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] ||
      b.count - a.count,
  );
}
