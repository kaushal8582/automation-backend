/**
 * Prefer Instagram "Original"/progressive streams over re-encoded NxP ladders.
 * Ladder qualities (1080P, 720P, …) from the third-party parser are often video-only (VP9/h264 without AAC).
 */
export function isLadderQuality(quality: string): boolean {
  return /^\d+\s*p$/i.test(quality.trim());
}

export function rankVideoResource(resource: {
  quality: string;
  size?: number;
}): number {
  const q = resource.quality || '';
  const sizeBoost = Math.min(Math.max(resource.size || 0, 0), 50_000_000) / 50_000_000;
  // Prefer non-ladder / Original — these usually include audio from IG CDN.
  // Ladder height must never outrank Original (1080*1000 previously beat 1_000_000).
  if (/original/i.test(q)) return 3_000_000 + sizeBoost;
  if (!isLadderQuality(q)) return 2_000_000 + sizeBoost;
  const m = q.match(/(\d+)\s*p/i);
  const height = m ? Number(m[1]) : 0;
  return height * 1000 + sizeBoost;
}

export function pickPreferredVideo<T extends { quality: string; size?: number }>(
  videos: T[],
): T | undefined {
  if (videos.length === 0) return undefined;
  return [...videos].sort((a, b) => rankVideoResource(b) - rankVideoResource(a))[0];
}
