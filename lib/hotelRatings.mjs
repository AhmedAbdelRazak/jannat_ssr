const finiteNumber = (value, fallback = 0) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

const boundedRating = (value) => Math.min(5, Math.max(0, finiteNumber(value)));

export const resolveHotelRating = (hotel = {}) => {
	const summary = hotel?.guestReviewSummary || {};
	const ratingCount = Math.max(0, Math.trunc(finiteNumber(summary.ratingCount)));
	const hasRealRating = ratingCount > 0;
	const ratingSum = Math.max(0, finiteNumber(summary.ratingSum));
	const suppliedAverage = boundedRating(summary.averageRating);
	const calculatedAverage = ratingCount ? boundedRating(ratingSum / ratingCount) : 0;
	const realRating = suppliedAverage > 0 ? suppliedAverage : calculatedAverage;

	return {
		rating: hasRealRating ? realRating : boundedRating(hotel?.hotelRating),
		ratingCount: hasRealRating ? ratingCount : 0,
		hasRealRating,
	};
};

export const compareHotelsByRating = (first = {}, second = {}) => {
	const firstRating = resolveHotelRating(first);
	const secondRating = resolveHotelRating(second);
	return secondRating.rating - firstRating.rating;
};
