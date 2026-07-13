export const DEAL_BUSINESS_TIME_ZONE = "Asia/Riyadh";
export const DEAL_CART_POLICY_VERSION = 2;
export const DEAL_DATE_SOURCE = "stored";

const safeNumber = (value, fallback = 0) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

const storedDateKey = (value = "") => {
	const text = String(value || "").trim();
	const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/);
	if (!match?.[1]) return "";
	const [year, month, day] = match[1].split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
		? match[1]
		: "";
};

export const dealDateKey = (value, { timeZone = DEAL_BUSINESS_TIME_ZONE } = {}) => {
	if (!(value instanceof Date) && /^\d{4}-\d{2}-\d{2}/.test(String(value || "").trim())) {
		return storedDateKey(value);
	}
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).formatToParts(date);
		const part = (type) => parts.find((row) => row.type === type)?.value || "";
		const year = part("year");
		const month = part("month");
		const day = part("day");
		return year && month && day ? `${year}-${month}-${day}` : "";
	} catch (_error) {
		return "";
	}
};

export const effectiveDealRange = (deal = {}) => ({
	from: deal?.from || "",
	to: deal?.to || "",
});

export const isFullyUpcomingDeal = (deal = {}, { today = new Date() } = {}) => {
	const range = effectiveDealRange(deal);
	const from = dealDateKey(range.from);
	const to = dealDateKey(range.to);
	const todayKey = dealDateKey(today);
	if (!from || !to || !todayKey || to <= from || from < todayKey) return false;
	const nights = Math.round(
		(Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000
	);
	const maxNights = deal.type === "monthly" ? 75 : 45;
	const latestSupportedYear = Number(todayKey.slice(0, 4)) + 5;
	return nights >= 1 && nights <= maxNights && Number(from.slice(0, 4)) <= latestSupportedYear;
};

const splitMoney = (amount = 0, count = 1) => {
	const safeCount = Math.max(1, Math.trunc(safeNumber(count, 1)));
	const cents = Math.round(safeNumber(amount, 0) * 100);
	const baseCents = Math.floor(cents / safeCount);
	const remainder = cents - baseCents * safeCount;
	return Array.from({ length: safeCount }, (_row, index) =>
		Number(((baseCents + (index < remainder ? 1 : 0)) / 100).toFixed(2))
	);
};

export const configuredDealTotals = (deal = {}, _nights = 1) => {
	if (deal.type === "monthly") {
		return {
			guestTotal: Math.max(0, safeNumber(deal.monthBase, 0)),
			rootTotal: Math.max(0, safeNumber(deal.monthRoot, 0)),
		};
	}
	return {
		guestTotal: Math.max(0, safeNumber(deal.base, 0)),
		rootTotal: Math.max(0, safeNumber(deal.root, 0)),
	};
};

export const configuredDealPricingParts = (deal = {}, nights = 1, commission = 0.1) => {
	const count = Math.max(1, Math.trunc(safeNumber(nights, 1)));
	const totals = configuredDealTotals(deal, count);
	const guestParts = splitMoney(totals.guestTotal, count);
	const rootParts = splitMoney(totals.rootTotal, count);
	const commissionRate = Math.max(0, safeNumber(commission, 0));
	const priceBeforeCommissionParts = splitMoney(
		totals.guestTotal - totals.rootTotal * commissionRate,
		count
	);
	return guestParts.map((guestPrice, index) => {
		const rootPrice = rootParts[index] || 0;
		return {
			guestPrice,
			rootPrice,
			priceBeforeCommission: priceBeforeCommissionParts[index] || 0,
		};
	});
};

export const isPackageCartItem = (item = {}) =>
	Boolean(item?.fromPackagesOffers || item?.packageMeta);

export const packageCartRange = (item = {}) => ({
	from: item?.packageMeta?.from || item?.checkIn || "",
	to: item?.packageMeta?.to || item?.checkOut || "",
});

export const isEligiblePackageCartItem = (item = {}, { today = new Date() } = {}) => {
	if (!isPackageCartItem(item)) return true;
	const packageMeta = item?.packageMeta;
	if (!packageMeta || packageMeta.dateSource !== DEAL_DATE_SOURCE) return false;
	if (Number(packageMeta.policyVersion) !== DEAL_CART_POLICY_VERSION) return false;
	const range = packageCartRange(item);
	const itemCheckIn = dealDateKey(item?.checkIn);
	const itemCheckOut = dealDateKey(item?.checkOut);
	const from = dealDateKey(range.from);
	const to = dealDateKey(range.to);
	if (!from || !to || itemCheckIn !== from || itemCheckOut !== to) return false;
	return isFullyUpcomingDeal(
		{
			type: packageMeta.type || "offer",
			from,
			to,
		},
		{ today }
	);
};

export const pruneIneligiblePackageCartItems = (items = [], { today = new Date() } = {}) =>
	(Array.isArray(items) ? items : []).filter((item) =>
		isEligiblePackageCartItem(item, { today })
	);

export const cartPackageIssue = (cart = [], { today = new Date() } = {}) => {
	const packageItems = (Array.isArray(cart) ? cart : []).filter(isPackageCartItem);
	const invalidItems = packageItems.filter(
		(item) => !isEligiblePackageCartItem(item, { today })
	);
	if (invalidItems.length) {
		return { code: "invalid-package", items: invalidItems };
	}
	if (packageItems.length && packageItems.length !== (Array.isArray(cart) ? cart.length : 0)) {
		return { code: "mixed-package-cart", items: packageItems };
	}
	const windows = new Set(
		packageItems.length
			? packageItems.map((item) => {
					const range = packageCartRange(item);
					return `${dealDateKey(range.from)}|${dealDateKey(range.to)}`;
				})
			: []
	);
	if (windows.size > 1) {
		return { code: "mixed-package-dates", items: packageItems };
	}
	return null;
};
