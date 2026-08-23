export type RatingTier = 's' | 'a' | 'b' | 'c' | 'd';

export interface RatingTierInfo {
  key: RatingTier;
  label: string;
}

/**
 * Maps the site's five-star ratings to the tiers used in the collection
 * pages. Movies retain their Letterboxd half-star granularity.
 */
export function ratingTier(rating: number): RatingTierInfo | null {
  if (!Number.isFinite(rating) || rating <= 0) return null;
  if (rating >= 5) return { key: 's', label: 'S Tier' };
  if (rating >= 4) return { key: 'a', label: 'A Tier' };
  if (rating >= 3) return { key: 'b', label: 'B Tier' };
  if (rating >= 2) return { key: 'c', label: 'C Tier' };
  return { key: 'd', label: 'D Tier' };
}
