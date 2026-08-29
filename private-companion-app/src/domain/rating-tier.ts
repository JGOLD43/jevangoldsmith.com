export type RatingTierKey = 's' | 'a' | 'b' | 'c' | 'd';

export type RatingTier = {
  key: RatingTierKey;
  label: string;
  detail: string;
  color: string;
};

export const RATING_TIERS: RatingTier[] = [
  { key: 's', label: 'S Tier', detail: '5 stars', color: '#F3D36B' },
  { key: 'a', label: 'A Tier', detail: '4–4½ stars', color: '#B492E5' },
  { key: 'b', label: 'B Tier', detail: '3–3½ stars', color: '#78B6E8' },
  { key: 'c', label: 'C Tier', detail: '2–2½ stars', color: '#82DC7A' },
  { key: 'd', label: 'D Tier', detail: '½–1½ stars', color: '#F4F4F4' },
];

export function ratingTier(rating: number): RatingTier | null {
  if (!Number.isFinite(rating) || rating <= 0) return null;
  if (rating >= 5) return RATING_TIERS[0];
  if (rating >= 4) return RATING_TIERS[1];
  if (rating >= 3) return RATING_TIERS[2];
  if (rating >= 2) return RATING_TIERS[3];
  return RATING_TIERS[4];
}
