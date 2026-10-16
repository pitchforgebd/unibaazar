import { distance } from "fastest-levenshtein";

function tokenize(value: string): string[] {
  return value.toLowerCase().split(/\s+/).filter(Boolean);
}

function wordScore(queryWord: string, candidateWord: string): number {
  if (candidateWord === queryWord) {
    return 3;
  }
  if (candidateWord.startsWith(queryWord)) {
    return 2;
  }
  if (candidateWord.includes(queryWord)) {
    return 1.5;
  }
  const maxDistance = queryWord.length <= 4 ? 1 : 2;
  if (queryWord.length >= 3 && distance(queryWord, candidateWord) <= maxDistance) {
    return 1;
  }
  return 0;
}

/**
 * Scores how well `haystack` matches `query`, tokenized by whitespace so word
 * order doesn't matter. Every query word must find at least one matching
 * haystack word (exact/prefix/substring/typo-tolerant) or the score is 0.
 * An empty query scores 1 for everything (no-op filter).
 */
export function matchScore(query: string, haystack: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return 1;
  }
  const haystackTokens = tokenize(haystack);
  let total = 0;
  for (const queryWord of queryTokens) {
    let best = 0;
    for (const haystackWord of haystackTokens) {
      best = Math.max(best, wordScore(queryWord, haystackWord));
    }
    if (best === 0) {
      return 0;
    }
    total += best;
  }
  return total;
}
