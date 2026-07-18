import assert from "node:assert/strict";
import test from "node:test";
import {
	buildReceiptRoomRows,
	countryCodeFromNationality,
	deriveReceiptPayment,
	displayNationality,
} from "../lib/officialReceipt.js";

test("receipt nationality supports ISO checkout values and legacy labels", () => {
	assert.equal(countryCodeFromNationality("EG"), "EG");
	assert.equal(countryCodeFromNationality("Egyptian"), "EG");
	assert.equal(displayNationality("EG", "EG"), "Egyptian");
});

test("receipt treats uncaptured card authorization as unpaid", () => {
	const payment = deriveReceiptPayment({
		total_amount: 600,
		paid_amount: 200,
		payment: "credit/ debit",
	});
	assert.equal(payment.paid, 0);
	assert.equal(payment.remaining, 600);
	assert.equal(payment.method.en, "Not captured");
});

test("receipt groups 20 equivalent agency room rows", () => {
	const pickedRoomsType = Array.from({ length: 20 }, () => ({
		room_type: "quadrupleRooms",
		displayName: "Quadruple Room",
		count: 1,
		pricingByDay: [{ price: 75 }, { price: 80 }],
	}));
	const rows = buildReceiptRoomRows({ pickedRoomsType }, {}, 2);
	assert.equal(rows.length, 1);
	assert.equal(rows[0].count, 20);
	assert.equal(rows[0].total, 3100);
});
