export type RatingTier = 's' | 'a' | 'b' | 'c' | 'd';

export interface RatingTierInfo {
  key: RatingTier;
  label: string;
  color: string;
}

/**
 * Maps the site's five-star ratings to the tiers used in the collection
 * pages. Movies retain their Letterboxd half-star granularity.
 */
export function ratingTier(rating: number): RatingTierInfo | null {
  if (!Number.isFinite(rating) || rating <= 0) return null;
  if (rating >= 5) return { key: 's', label: 'S', color: '#f3d36b' };
  if (rating >= 4) return { key: 'a', label: 'A', color: '#b492e5' };
  if (rating >= 3) return { key: 'b', label: 'B', color: '#78b6e8' };
  if (rating >= 2) return { key: 'c', label: 'C', color: '#82dc7a' };
  return { key: 'd', label: 'D', color: '#f4f4f4' };
}
