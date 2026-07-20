import assert from "node:assert/strict";
import test from "node:test";

import { clientPaymentHotelName } from "../lib/clientPayment.js";

test("client payment hotel name supports the direct reservation field", () => {
	assert.equal(clientPaymentHotelName({ hotelName: "zad ajyad" }), "zad ajyad");
});

test("client payment hotel name supports a populated hotel", () => {
	assert.equal(
		clientPaymentHotelName({ hotelId: { hotelName: "Zad Ajyad" } }),
		"Zad Ajyad"
	);
});

test("client payment hotel name always provides a safe fallback", () => {
	assert.equal(clientPaymentHotelName(), "Jannat Booking");
	assert.equal(clientPaymentHotelName({ hotelName: "   " }), "Jannat Booking");
});
