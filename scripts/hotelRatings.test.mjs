import assert from "node:assert/strict";
import test from "node:test";
import { compareHotelsByRating, resolveHotelRating } from "../lib/hotelRatings.mjs";

test("uses the active guest aggregate whenever at least one real rating exists", () => {
	assert.deepEqual(
		resolveHotelRating({
			hotelRating: 5,
			guestReviewSummary: { averageRating: 4.25, ratingCount: 8, ratingSum: 34 },
		}),
		{ rating: 4.25, ratingCount: 8, hasRealRating: true }
	);
});

test("falls back to the bounded legacy score when there are no guest ratings", () => {
	assert.deepEqual(
		resolveHotelRating({
			hotelRating: 9,
			guestReviewSummary: { averageRating: 4.8, ratingCount: 0, ratingSum: 0 },
		}),
		{ rating: 5, ratingCount: 0, hasRealRating: false }
	);
});

test("derives a missing aggregate average from its rating sum", () => {
	assert.deepEqual(
		resolveHotelRating({
			hotelRating: 5,
			guestReviewSummary: { ratingCount: 4, ratingSum: 15 },
		}),
		{ rating: 3.75, ratingCount: 4, hasRealRating: true }
	);
});

test("sorts by presented rating without changing equal-score source order", () => {
	const hotels = [
		{ hotelName: "Legacy", hotelRating: 5 },
		{ hotelName: "One rating", hotelRating: 4, guestReviewSummary: { averageRating: 5, ratingCount: 1 } },
		{ hotelName: "Three ratings", hotelRating: 4, guestReviewSummary: { averageRating: 5, ratingCount: 3 } },
		{ hotelName: "Lower real rating", hotelRating: 5, guestReviewSummary: { averageRating: 4.8, ratingCount: 10 } },
	];

	assert.deepEqual(
		[...hotels].sort(compareHotelsByRating).map((hotel) => hotel.hotelName),
		["Legacy", "One rating", "Three ratings", "Lower real rating"]
	);
});
