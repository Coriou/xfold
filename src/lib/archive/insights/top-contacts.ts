// ---------------------------------------------------------------------------
// Top contacts — thin wrapper around buildContactMap
// ---------------------------------------------------------------------------
//
// buildContactMap already returns contacts sorted by totalInteractions desc.
// This helper exists so callers (share cards, wrapped section) can ask for
// "the top N contacts" without re-importing the heavier conversation
// intelligence module directly.
// ---------------------------------------------------------------------------

import type { Contact } from "@/lib/archive/conversation-intelligence";
import { buildContactMap } from "@/lib/archive/conversation-intelligence";
import type { ParsedArchive } from "@/lib/archive/types";

export type { Contact } from "@/lib/archive/conversation-intelligence";

export function topContacts(archive: ParsedArchive, n: number): Contact[] {
  if (n <= 0) return [];
  return buildContactMap(archive).slice(0, n);
}
