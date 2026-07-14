export const ratingAwareFetchOptions = (freshRatings, revalidate) =>
	freshRatings ? { cache: "no-store" } : { revalidate };
