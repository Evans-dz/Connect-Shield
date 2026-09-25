// Page titles stay at or under 65 characters (the EZHD polish standard).
// The root layout appends TITLE_SUFFIX. When a page's own wording plus the
// suffix runs long, drop the suffix before touching the wording: search
// results already show the site name, and several titles are CTR-tuned.

export const TITLE_SUFFIX = " | Connect Shield";
export const TITLE_MAX = 65;

// Candidates run from preferred to shortest. Each is tried with the suffix,
// then on its own, before falling through to the next.
export function fitTitle(...candidates) {
  for (const t of candidates) {
    if (t.length + TITLE_SUFFIX.length <= TITLE_MAX) return t;
    if (t.length <= TITLE_MAX) return { absolute: t };
  }
  return { absolute: candidates[candidates.length - 1] };
}
