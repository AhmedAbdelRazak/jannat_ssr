import assert from "node:assert/strict";
import test from "node:test";
import {
	compactHotelForCard,
	hotelCardFeatures,
	hotelCardImages,
	hotelCardPrice,
} from "../lib/hotelCardData.mjs";
import { canOptimizeImageUrl } from "../lib/imageOptimization.mjs";

const hotel = {
	_id: "hotel-1",
	hotelName: "Example Hotel",
	hotelAddress: "Example Street",
	hotelCity: "Makkah",
	hotelRating: 4,
	guestReviewSummary: { ratingCount: 2, ratingSum: 9, averageRating: 4.5 },
	hotelPhotos: ["/assets/one.jpg", "/assets/one.jpg", "/assets/two.jpg"],
	roomCountDetails: [
		{
			price: { basePrice: 450 },
			photos: ["/assets/three.jpg"],
			amenities: ["WiFi", "TV"],
			views: ["City view"],
		},
		{
			price: { basePrice: 300 },
			photos: ["/assets/four.jpg", "/assets/five.jpg", "/assets/six.jpg"],
			amenities: ["WiFi"],
			extraAmenities: ["Coffee"],
		},
	],
};

test("card data keeps the exact visible price, images, room count, and features", () => {
	assert.equal(hotelCardPrice(hotel), 300);
	assert.deepEqual(hotelCardImages(hotel), [
		"/assets/one.jpg",
		"/assets/two.jpg",
		"/assets/three.jpg",
		"/assets/four.jpg",
		"/assets/five.jpg",
	]);
	assert.deepEqual(hotelCardFeatures(hotel), ["WiFi", "TV", "City view", "Coffee"]);

	const compact = compactHotelForCard(hotel);
	assert.equal(compact.cardPrice, 300);
	assert.equal(compact.cardRoomCount, 2);
	assert.equal(compact.guestReviewSummary.averageRating, 4.5);
	assert.deepEqual(compact.cardImages, hotelCardImages(hotel));
	assert.deepEqual(compact.cardFeatures, hotelCardFeatures(hotel));
});

test("card compaction omits heavy room and original photo arrays", () => {
	const compact = compactHotelForCard(hotel);
	assert.equal("roomCountDetails" in compact, false);
	assert.equal("hotelPhotos" in compact, false);
	assert.equal(JSON.stringify(compact).includes("/assets/six.jpg"), false);
});

test("image optimization accepts configured sources and safely rejects future unknowns", () => {
	assert.equal(canOptimizeImageUrl("/assets/janat/hotel.jpg"), true);
	assert.equal(
		canOptimizeImageUrl(
			"/assets/janat/hotel.jpg?v=zad-ajyad-20260712"
		),
		true
	);
	assert.equal(canOptimizeImageUrl("/destinations/makkah.png"), true);
	assert.equal(
		canOptimizeImageUrl(
			"https://res.cloudinary.com/infiniteapps/image/upload/v1/hotel.jpg"
		),
		true
	);
	assert.equal(canOptimizeImageUrl("/assets/janat/hotel.jpg?v=future-version"), false);
	assert.equal(canOptimizeImageUrl("https://example.com/hotel.jpg"), false);
	assert.equal(canOptimizeImageUrl("http://res.cloudinary.com/infiniteapps/image/upload/x"), false);
});
