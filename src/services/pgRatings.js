import { Review } from "../models/Review.js";

const EMPTY_RATING = Object.freeze({ average: 0, count: 0, reviews: [] });

export function attachProviderRating(sanitizedProvider, ratingMap) {
  const key = String(sanitizedProvider.id || "").toLowerCase();
  const rating = ratingMap.get(key) || EMPTY_RATING;

  return {
    ...sanitizedProvider,
    rating: {
      average: Number(rating.average || 0),
      count: Number(rating.count || 0),
      reviews: Array.isArray(rating.reviews) ? rating.reviews : [],
    },
  };
}

export async function enrichSanitizedProvidersWithRatings(sanitizedProviders = []) {
  if (!sanitizedProviders.length) return [];

  const ratingMap = await Review.getRatingSummariesByProviderIds(
    sanitizedProviders.map((item) => item.id),
  );

  return sanitizedProviders.map((item) => attachProviderRating(item, ratingMap));
}

export async function enrichSanitizedProviderWithRating(sanitizedProvider) {
  const [enriched] = await enrichSanitizedProvidersWithRatings(
    sanitizedProvider ? [sanitizedProvider] : [],
  );
  return enriched || sanitizedProvider;
}
