import assert from "node:assert/strict";
import test from "node:test";
import {
	configuredDealPricingParts,
	configuredDealTotals,
	dealDateKey,
	isFullyUpcomingDeal,
} from "../lib/dealPolicy.mjs";

const sum = (rows, key) =>
	Number(rows.reduce((total, row) => total + Number(row[key] || 0), 0).toFixed(2));

test("deal calendar dates are stable in the Saudi business timezone", () => {
	assert.equal(dealDateKey("2026-07-15"), "2026-07-15");
	assert.equal(dealDateKey("2026-07-15T06:59:59.000Z"), "2026-07-15");
	assert.equal(dealDateKey("not-a-date"), "");
});

test("a full-range deal disappears on its start date", () => {
	const deal = { from: "2026-06-15", to: "2026-07-15" };
	assert.equal(isFullyUpcomingDeal(deal, { today: "2026-06-14" }), true);
	assert.equal(isFullyUpcomingDeal(deal, { today: "2026-06-15" }), false);
	assert.equal(isFullyUpcomingDeal(deal, { today: "2026-06-16" }), false);
});

test("invalid, incomplete, reversed, extreme, and overlong ranges do not qualify", () => {
	assert.equal(isFullyUpcomingDeal({ from: "", to: "2026-08-01" }, { today: "2026-07-12" }), false);
	assert.equal(isFullyUpcomingDeal({ from: "2026-08-10", to: "2026-08-01" }, { today: "2026-07-12" }), false);
	assert.equal(isFullyUpcomingDeal({ from: "bad", to: "worse" }, { today: "2026-07-12" }), false);
	assert.equal(isFullyUpcomingDeal({ from: "2800-02-12", to: "2800-03-24" }, { today: "2026-07-12" }), false);
	assert.equal(isFullyUpcomingDeal({ from: "2026-08-01", to: "2027-01-01" }, { today: "2026-07-12" }), false);
});

test("the effective Hijri range controls eligibility instead of malformed stored dates", () => {
	const deal = {
		from: "2025-01-31",
		to: "2800-01-01",
		hijriRange: { checkIn: "2027-02-02", checkOut: "2027-03-13" },
	};
	assert.equal(isFullyUpcomingDeal(deal, { today: "2026-07-12" }), true);
});

test("monthly configured price is the exact guest package total", () => {
	const deal = { type: "monthly", monthBase: 2100, monthRoot: 2000 };
	assert.deepEqual(configuredDealTotals(deal, 29), { guestTotal: 2100, rootTotal: 2000 });
	const rows = configuredDealPricingParts(deal, 29, 0.1);
	assert.equal(rows.length, 29);
	assert.equal(sum(rows, "guestPrice"), 2100);
	assert.equal(sum(rows, "rootPrice"), 2000);
	assert.equal(sum(rows, "priceBeforeCommission"), 1900);
});

test("special offer configured price remains nightly across the full stay", () => {
	const deal = { type: "offer", base: 2800, root: 2500 };
	assert.deepEqual(configuredDealTotals(deal, 39), {
		guestTotal: 109200,
		rootTotal: 97500,
	});
	const rows = configuredDealPricingParts(deal, 39, 0.1);
	assert.equal(rows.every((row) => row.guestPrice === 2800), true);
	assert.equal(sum(rows, "guestPrice"), 109200);
	assert.equal(sum(rows, "rootPrice"), 97500);
	assert.equal(sum(rows, "priceBeforeCommission"), 99450);
});
