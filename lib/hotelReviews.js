export const HOTEL_REVIEW_PAGE_SIZE = 6;

const finiteNumber = (value, fallback = 0) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

const boundedRating = (value) => Math.min(5, Math.max(0, finiteNumber(value)));

export const emptyHotelReviewSummary = () => ({
	ratingCount: 0,
	ratingSum: 0,
	averageRating: 0,
	breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
	hasRealRating: false,
});

export const normalizeHotelReviewSummary = (summary = {}) => {
	const ratingCount = Math.max(0, Math.trunc(finiteNumber(summary?.ratingCount)));
	const ratingSum = Math.max(0, finiteNumber(summary?.ratingSum));
	const calculatedAverage = ratingCount ? ratingSum / ratingCount : 0;
	const suppliedAverage = finiteNumber(summary?.averageRating);
	const averageRating = ratingCount
		? boundedRating(suppliedAverage > 0 ? suppliedAverage : calculatedAverage)
		: 0;
	const sourceBreakdown = summary?.breakdown || {};
	const breakdown = [1, 2, 3, 4, 5].reduce((result, rating) => {
		const arrayValue = Array.isArray(sourceBreakdown) ? sourceBreakdown[rating - 1] : null;
		const value = Array.isArray(sourceBreakdown)
			? typeof arrayValue === "object"
				? arrayValue?.count ?? arrayValue?.total ?? 0
				: arrayValue
			: sourceBreakdown[rating] ?? sourceBreakdown[String(rating)];
		result[rating] = Math.max(0, Math.trunc(finiteNumber(value)));
		return result;
	}, {});

	return {
		ratingCount,
		ratingSum,
		averageRating,
		breakdown,
		hasRealRating: ratingCount > 0,
	};
};

export const normalizeHotelReviewPage = (payload = {}, limit = HOTEL_REVIEW_PAGE_SIZE) => {
	const available =
		typeof payload?.available === "boolean"
			? payload.available
			: Boolean(payload && typeof payload === "object");
	const pageSize = Math.max(1, Math.min(20, Math.trunc(finiteNumber(limit, HOTEL_REVIEW_PAGE_SIZE))));
	const reviews = Array.isArray(payload?.reviews) ? payload.reviews.slice(0, pageSize) : [];
	const rawPagination = payload?.pagination || {};
	const page = Math.max(
		1,
		Math.trunc(finiteNumber(rawPagination.page ?? rawPagination.currentPage, 1))
	);
	const totalItems = Math.max(
		0,
		Math.trunc(
			finiteNumber(
				rawPagination.totalItems ??
					rawPagination.total ??
					rawPagination.totalReviews ??
					rawPagination.totalDocs,
				normalizeHotelReviewSummary(payload?.summary).ratingCount
			)
		)
	);
	const totalPages = Math.max(
		1,
		Math.trunc(
			finiteNumber(
				rawPagination.totalPages ?? rawPagination.pages,
				Math.ceil(totalItems / pageSize) || 1
			)
		)
	);

	return {
		available,
		hotel: payload?.hotel || null,
		summary: normalizeHotelReviewSummary(payload?.summary),
		reviews,
		pagination: {
			page: Math.min(page, totalPages),
			limit: pageSize,
			totalItems,
			totalPages,
			hasNextPage:
				typeof rawPagination.hasNextPage === "boolean"
					? rawPagination.hasNextPage
					: typeof rawPagination.hasNext === "boolean"
						? rawPagination.hasNext
						: page < totalPages,
		},
	};
};
