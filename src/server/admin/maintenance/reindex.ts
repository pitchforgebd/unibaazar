// Searched for a search-index artifact to rebuild (grepped `matchScore`,
// src/lib/catalog/search.ts, FULLTEXT/fulltext across src/) and found none:
// src/lib/catalog/search.ts's `matchScore()` just scores product name/
// description strings in memory against whatever `/api/v1/search` already
// pulled from MySQL with a live query (src/lib/catalog/queries.ts) — there is
// no FULLTEXT index, no separate search table, nothing pre-computed to go
// stale. This job is a deliberate no-op rather than invented indexing work;
// if a real search index (e.g. FULLTEXT columns, a dedicated index table) is
// added later, give it a real rebuild job here.
export async function reindexSearch(): Promise<{ note: string }> {
  return {
    note:
      "No-op: search is a live MySQL query scored in memory " +
      "(src/lib/catalog/search.ts), not a separate index. There is nothing to reindex.",
  };
}
