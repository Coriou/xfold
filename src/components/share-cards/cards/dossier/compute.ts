import { buildTextCorpus } from "@/lib/archive/insights/tokenizer";
import type { ComputeContext } from "../../types";

export interface DossierInterest {
  readonly name: string;
  /** True when the user has never mentioned this interest in their own writing. */
  readonly noEvidence: boolean;
}

export interface DossierCardProps {
  readonly username: string;
  readonly displayName: string;
  readonly accountId: string;
  readonly gender: string | null;
  readonly ageRange: string | null;
  readonly languages: readonly string[];
  /** First location row from personalization.locationHistory, when present. */
  readonly location: string | null;
  /** Up to 6 named interests, with the spiciest one (no evidence) first. */
  readonly interests: readonly DossierInterest[];
  readonly totalInterests: number;
  /** Up to 2 named shows. */
  readonly shows: readonly string[];
  readonly numAudiences: number;
  readonly numLookalikes: number;
}

const MAX_INTERESTS = 6;
const MAX_SHOWS = 2;

/** Score for ranking interests in the dossier — higher = more shareable. */
function scoreInterest(name: string, hasEvidence: boolean): number {
  let score = 0;
  // No-evidence interests are the most viral ("X says you love badminton — you've never mentioned it").
  if (!hasEvidence) score += 50;
  // Long names tend to be more specific/embarrassing.
  score += Math.min(20, name.length / 3);
  // Interests starting with $ (tickers) or containing a person's name are more specific.
  if (name.startsWith("$")) score += 10;
  if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(name)) score += 15;
  return score;
}

export function computeDossier(ctx: ComputeContext): DossierCardProps | null {
  const p = ctx.archive.personalization;
  if (!p) return null;

  const activeInterests = p.interests
    .filter((i) => !i.isDisabled)
    .map((i) => i.name);

  // Demand at least *some* signal — gender, age, an interest, or a show.
  if (
    !p.gender &&
    !p.inferredAge &&
    activeInterests.length === 0 &&
    p.shows.length === 0
  ) {
    return null;
  }

  // Tokenize tweets + likes for cross-referencing.
  const texts: string[] = [];
  for (const t of ctx.archive.tweets) texts.push(t.fullText);
  for (const l of ctx.archive.likes) {
    if (l.fullText) texts.push(l.fullText);
  }
  const corpus = buildTextCorpus(texts);

  const ranked = activeInterests
    .map((name) => {
      const hasEvidence = corpus.contains(name);
      return { name, noEvidence: !hasEvidence, score: scoreInterest(name, hasEvidence) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_INTERESTS)
    .map(({ name, noEvidence }) => ({ name, noEvidence }));

  const firstLocation = p.locationHistory[0];
  const location = firstLocation
    ? [firstLocation.city, firstLocation.region, firstLocation.country]
        .filter((s): s is string => Boolean(s))
        .join(", ") || null
    : null;

  return {
    username: ctx.archive.meta.username,
    displayName: ctx.archive.meta.displayName,
    accountId: ctx.archive.meta.accountId,
    gender: p.gender,
    ageRange: p.inferredAge,
    languages: p.languages.filter((l) => !l.isDisabled).map((l) => l.language),
    location,
    interests: ranked,
    totalInterests: activeInterests.length,
    shows: p.shows.slice(0, MAX_SHOWS),
    numAudiences: p.numAudiences,
    numLookalikes: p.lookalikeAdvertisers.length,
  };
}

export function computeDossierShareability(props: DossierCardProps) {
  // The dossier is uniquely shareable when it can quote *named* things.
  let specificity = 60;
  if (props.interests.some((i) => i.noEvidence)) specificity += 20;
  if (props.shows.length > 0) specificity += 10;
  if (props.location) specificity += 5;

  const magnitude = Math.min(
    100,
    20 + props.totalInterests / 2 + props.numAudiences,
  );

  return {
    magnitude,
    specificity: Math.min(100, specificity),
    uniqueness: 80,
  };
}
