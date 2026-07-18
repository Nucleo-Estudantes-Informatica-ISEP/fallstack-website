export interface GiveawayCandidate {
  id: string;
  points: number;
}

/**
 * Weighted-random winner selection: each candidate's chance of winning is
 * proportional to their points. Returns null when nobody has points.
 * Pure (no I/O) so it can be tested and reused server-side.
 */
export function pickWeightedWinner<T extends GiveawayCandidate>(
  candidates: T[]
): T | null {
  const total = candidates.reduce((sum, c) => sum + Math.max(0, c.points), 0);
  if (total <= 0) return null;

  let threshold = Math.random() * total;
  for (const candidate of candidates) {
    threshold -= Math.max(0, candidate.points);
    if (threshold < 0) return candidate;
  }
  return candidates[candidates.length - 1] ?? null;
}
