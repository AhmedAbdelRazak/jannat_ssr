import assert from "node:assert/strict";
import test from "node:test";
import {
	DEAL_CART_POLICY_VERSION,
	DEAL_DATE_SOURCE,
	cartPackageIssue,
	configuredDealPricingParts,
	configuredDealTotals,
	dealDateKey,
	isEligiblePackageCartItem,
	isFullyUpcomingDeal,
	pruneIneligiblePackageCartItems,
} from "../lib/dealPolicy.mjs";
import { normalizeOffer, resolveDealStay, roomDealGroups } from "../lib/deals.js";

const sum = (rows, key) =>
	Number(rows.reduce((total, row) => total + Number(row[key] || 0), 0).toFixed(2));

test("stored deal timestamps keep their calendar prefix while today uses Saudi time", () => {
	assert.equal(dealDateKey("2026-07-15"), "2026-07-15");
	assert.equal(dealDateKey("2026-07-15T06:59:59.000Z"), "2026-07-15");
	assert.equal(dealDateKey("2026-02-12T22:00:00.000Z"), "2026-02-12");
	assert.equal(dealDateKey(new Date("2026-07-15T21:01:00.000Z")), "2026-07-16");
	assert.equal(dealDateKey("2026-02-31T00:00:00.000Z"), "");
	assert.equal(dealDateKey("not-a-date"), "");
});

test("a full-range deal is eligible through check-in day but never after it starts", () => {
	const deal = { from: "2026-07-15", to: "2026-08-15" };
	assert.equal(isFullyUpcomingDeal(deal, { today: "2026-07-14" }), true);
	assert.equal(isFullyUpcomingDeal(deal, { today: "2026-07-15" }), true);
	assert.equal(isFullyUpcomingDeal(deal, { today: "2026-07-16" }), false);
});

test("invalid, incomplete, reversed, extreme, and overlong ranges do not qualify", () => {
	assert.equal(isFullyUpcomingDeal({ from: "", to: "2026-08-01" }, { today: "2026-07-12" }), false);
	assert.equal(isFullyUpcomingDeal({ from: "2026-08-10", to: "2026-08-01" }, { today: "2026-07-12" }), false);
	assert.equal(isFullyUpcomingDeal({ from: "bad", to: "worse" }, { today: "2026-07-12" }), false);
	assert.equal(isFullyUpcomingDeal({ from: "2800-02-12", to: "2800-03-24" }, { today: "2026-07-12" }), false);
	assert.equal(isFullyUpcomingDeal({ from: "2026-08-01", to: "2027-01-01" }, { today: "2026-07-12" }), false);
});

test("an inferred future Hijri range can never resurrect an expired stored deal", () => {
	const deal = {
		from: "2026-02-12",
		to: "2026-03-24",
		hijriRange: { checkIn: "2027-02-02", checkOut: "2027-03-13" },
	};
	assert.equal(isFullyUpcomingDeal(deal, { today: "2026-07-12" }), false);
});

test("a yearless offer name neither creates a Hijri year nor overrides stored dates", () => {
	const deal = normalizeOffer({
		_id: "6901b8bbdbc949fb1a9de235",
		offerName: "25 شعبان الى 5 شوال",
		offerFrom: "2026-02-12T22:00:00.000Z",
		offerTo: "2026-03-24T21:59:59.000Z",
		offerPrice: 3800,
		offerRootPrice: 3600,
	});
	assert.equal(deal.hijriRange, null);
	assert.equal(deal.from, "2026-02-12");
	assert.equal(deal.to, "2026-03-24");
	assert.deepEqual(resolveDealStay(deal), {
		checkIn: "2026-02-12",
		checkOut: "2026-03-24",
		nights: 40,
		locked: true,
		usesSelectedStayDates: false,
		hijriRange: null,
	});
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

test("special offer configured price is the exact full-package total", () => {
	const deal = { type: "offer", base: 3800, root: 3600 };
	assert.deepEqual(configuredDealTotals(deal, 39), {
		guestTotal: 3800,
		rootTotal: 3600,
	});
	const rows = configuredDealPricingParts(deal, 39, 0.1);
	assert.equal(rows.length, 39);
	assert.equal(sum(rows, "guestPrice"), 3800);
	assert.equal(sum(rows, "rootPrice"), 3600);
	assert.equal(sum(rows, "priceBeforeCommission"), 3440);
});

test("distinct backend offer subdocuments remain distinct deal rows", () => {
	const groups = roomDealGroups({
		roomCountDetails: [
			{
				_id: "room-1",
				offers: [
					{ _id: "offer-a", offerName: "Package", offerFrom: "2026-08-01", offerTo: "2026-08-10", offerPrice: 1000 },
					{ _id: "offer-b", offerName: "Package", offerFrom: "2026-08-11", offerTo: "2026-08-20", offerPrice: 1200 },
				],
				monthly: [],
			},
		],
	}, { today: "2026-07-12" });
	assert.equal(groups.length, 1);
	assert.deepEqual(groups[0].deals.map((deal) => deal.id), ["offer-a", "offer-b"]);
	assert.deepEqual(groups[0].deals.map((deal) => deal.base), [1000, 1200]);
});

const packageCartItem = (from = "2026-07-15", to = "2026-08-15") => ({
	checkIn: from,
	checkOut: to,
	fromPackagesOffers: true,
	packageMeta: {
		type: "offer",
		from,
		to,
		dateSource: DEAL_DATE_SOURCE,
		policyVersion: DEAL_CART_POLICY_VERSION,
	},
});

test("stale, in-progress, and legacy package cart entries fail closed", () => {
	const item = packageCartItem();
	assert.equal(isEligiblePackageCartItem(item, { today: "2026-07-15" }), true);
	assert.equal(isEligiblePackageCartItem(item, { today: "2026-07-16" }), false);
	assert.equal(
		isEligiblePackageCartItem(
			{ ...item, packageMeta: { ...item.packageMeta, policyVersion: 1 } },
			{ today: "2026-07-14" }
		),
		false
	);
	assert.deepEqual(
		pruneIneligiblePackageCartItems([item, { id: "standard-room" }], {
			today: "2026-07-16",
		}),
		[{ id: "standard-room" }]
	);
});

test("fixed packages cannot mix with standard rooms or other package windows", () => {
	const fixed = packageCartItem("2026-08-01", "2026-08-10");
	const sameWindowRoom = { checkIn: "2026-08-01", checkOut: "2026-08-10" };
	const otherWindowRoom = { checkIn: "2026-08-02", checkOut: "2026-08-11" };
	assert.equal(
		cartPackageIssue([fixed, sameWindowRoom], { today: "2026-07-12" })?.code,
		"mixed-package-cart"
	);
	assert.equal(
		cartPackageIssue([fixed, otherWindowRoom], { today: "2026-07-12" })?.code,
		"mixed-package-cart"
	);
	assert.equal(
		cartPackageIssue(
			[fixed, packageCartItem("2026-08-01", "2026-08-10")],
			{ today: "2026-07-12" }
		),
		null
	);
	assert.equal(
		cartPackageIssue(
			[fixed, packageCartItem("2026-08-02", "2026-08-11")],
			{ today: "2026-07-12" }
		)?.code,
		"mixed-package-dates"
	);
});
