// ---------------------------------------------------------------------------
// Text corpus / tokenizer — pure derivation
// ---------------------------------------------------------------------------
//
// Builds a normalized, searchable corpus from a list of input strings (e.g.
// tweet bodies, like text). Used by cross-data insights that need to ask
// "does this user actually mention X in their own writing?" — for example
// when comparing inferred interests against what the user actually tweeted.
//
// Normalization rules:
//   - lowercase
//   - URLs stripped (http(s)://… and t.co/…)
//   - @mentions stripped
//   - leading # of hashtags stripped (the word stays)
//   - punctuation stripped (kept: digits, $, dashes inside words)
//
// `tokens` is a Set of single-word lowercase tokens. `contains` and `count`
// search the joined normalized text for substrings, so multi-word terms
// like "Andrew Tate" still match.
// ---------------------------------------------------------------------------

export interface TextCorpus {
  /** Each input, normalized (lowercase, URLs/mentions removed). */
  readonly normalized: readonly string[];
  /** Single-word lowercase tokens, deduplicated. */
  readonly tokens: ReadonlySet<string>;
  /** True if the lowercase needle appears anywhere in the joined text. */
  contains(needle: string): boolean;
  /** Number of substring matches (case-insensitive) across all texts. */
  count(needle: string): number;
}

const URL_RE = /https?:\/\/\S+/g;
const TCO_RE = /\bt\.co\/\S+/g;
const MENTION_RE = /@[\w]+/g;
const HASHTAG_HASH_RE = /#(\w)/g;
const PUNCTUATION_RE = /[^\p{L}\p{N}\s$-]/gu;
const WHITESPACE_RE = /\s+/g;

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(URL_RE, " ")
    .replace(TCO_RE, " ")
    .replace(MENTION_RE, " ")
    .replace(HASHTAG_HASH_RE, "$1")
    .replace(PUNCTUATION_RE, " ")
    .replace(WHITESPACE_RE, " ")
    .trim();
}

export function buildTextCorpus(texts: readonly string[]): TextCorpus {
  const normalized: string[] = [];
  const tokens = new Set<string>();

  for (const text of texts) {
    if (!text) continue;
    const norm = normalize(text);
    if (!norm) continue;
    normalized.push(norm);
    for (const word of norm.split(" ")) {
      if (word.length > 0) tokens.add(word);
    }
  }

  // Pre-join once for cheap substring search.
  const joined = normalized.join(" \u0001 ");

  return {
    normalized,
    tokens,
    contains(needle: string): boolean {
      const n = needle.toLowerCase().trim();
      if (!n) return false;
      return joined.includes(n);
    },
    count(needle: string): number {
      const n = needle.toLowerCase().trim();
      if (!n) return 0;
      let i = 0;
      let count = 0;
      let found = joined.indexOf(n, i);
      while (found !== -1) {
        count++;
        i = found + n.length;
        found = joined.indexOf(n, i);
      }
      return count;
    },
  };
}
