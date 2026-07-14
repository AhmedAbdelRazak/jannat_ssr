import assert from "node:assert/strict";
import test from "node:test";

import {
	normalizeHotelReview,
	normalizeHotelReviewPage,
} from "../lib/hotelReviews.js";
import { ratingAwareFetchOptions } from "../lib/ratingFetchOptions.js";

const baseReview = {
	_id: "review-1",
	displayName: "Ahmed A.",
	rating: 5,
	comment: "Excellent stay",
	verifiedStay: true,
	createdAt: "2026-07-13T00:00:00.000Z",
};

test("legacy active and former no-metadata payloads stay visible during rollout", () => {
	for (const source of [
		{ ...baseReview, status: "active" },
		{ ...baseReview },
	]) {
		const normalized = normalizeHotelReview(source);
		assert.equal(normalized.rating, 5);
		assert.equal(normalized.comment, "Excellent stay");
		assert.equal(normalized.ratingVisible, true);
		assert.equal(normalized.commentVisible, true);
		assert.equal(Object.hasOwn(normalized, "firstName"), false);
	}
});

test("legacy inactive reviews and explicitly fully hidden reviews fail closed", () => {
	assert.equal(
		normalizeHotelReview({ ...baseReview, status: "inactive" }),
		null
	);
	assert.equal(
		normalizeHotelReview({
			...baseReview,
			ratingVisible: false,
			commentVisible: false,
			privateValue: "must not leak",
		}),
		null
	);
});

test("comment-only moderation removes the rating but preserves public text", () => {
	const normalized = normalizeHotelReview({
		...baseReview,
		ratingVisible: false,
		commentVisible: true,
	});
	assert.equal(normalized.rating, null);
	assert.equal(normalized.comment, "Excellent stay");
	assert.equal(normalized.ratingVisible, false);
	assert.equal(normalized.commentVisible, true);
});

test("rating-only moderation removes comment text but preserves the score", () => {
	const normalized = normalizeHotelReview({
		...baseReview,
		ratingVisible: true,
		commentVisible: false,
	});
	assert.equal(normalized.rating, 5);
	assert.equal(normalized.comment, "");
	assert.equal(normalized.ratingVisible, true);
	assert.equal(normalized.commentVisible, false);
});

test("invalid ratings cannot be exposed while a valid visible comment may remain", () => {
	const normalized = normalizeHotelReview({
		...baseReview,
		rating: 7,
		ratingVisible: true,
		commentVisible: true,
	});
	assert.equal(normalized.rating, null);
	assert.equal(normalized.ratingVisible, false);
	assert.equal(normalized.comment, "Excellent stay");
});

test("partial visibility metadata fails closed for omitted parts", () => {
	const ratingOnly = normalizeHotelReview({
		...baseReview,
		ratingVisible: true,
	});
	assert.equal(ratingOnly.ratingVisible, true);
	assert.equal(ratingOnly.commentVisible, false);
	assert.equal(ratingOnly.comment, "");

	const hidden = normalizeHotelReview({
		...baseReview,
		ratingVisible: false,
	});
	assert.equal(hidden, null);

	const activeStatusCannotExposeOmittedComment = normalizeHotelReview({
		...baseReview,
		status: "active",
		ratingVisible: false,
	});
	assert.equal(activeStatusCannotExposeOmittedComment, null);
});

test("public review pagination stays independent from the visible-rating count", () => {
	const page = normalizeHotelReviewPage({
		summary: {
			ratingCount: 1,
			ratingSum: 5,
			averageRating: 5,
		},
		reviews: [
			{ ...baseReview, ratingVisible: true, commentVisible: false },
			{
				...baseReview,
				_id: "review-2",
				ratingVisible: false,
				commentVisible: true,
			},
			{
				...baseReview,
				_id: "review-hidden",
				ratingVisible: false,
				commentVisible: false,
			},
		],
		pagination: { page: 1, limit: 6, totalItems: 2, totalPages: 1 },
	});

	assert.equal(page.summary.ratingCount, 1);
	assert.equal(page.pagination.totalItems, 2);
	assert.deepEqual(
		page.reviews.map((review) => review._id),
		["review-1", "review-2"]
	);
});

test("comment-only pages have a safe pagination fallback when metadata is absent", () => {
	const page = normalizeHotelReviewPage({
		summary: { ratingCount: 0, ratingSum: 0 },
		reviews: [
			{ ...baseReview, ratingVisible: false, commentVisible: true },
		],
	});
	assert.equal(page.summary.hasRealRating, false);
	assert.equal(page.pagination.totalItems, 1);
	assert.equal(page.reviews.length, 1);
});

test("rating-presenting pages bypass the Next data cache without changing defaults", () => {
	assert.deepEqual(ratingAwareFetchOptions(true, 60), { cache: "no-store" });
	assert.deepEqual(ratingAwareFetchOptions(false, 60), { revalidate: 60 });
	assert.deepEqual(ratingAwareFetchOptions(false, 30), { revalidate: 30 });
});
