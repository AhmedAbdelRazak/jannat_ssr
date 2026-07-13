import dayjs from "dayjs";
import { generateDateRange, safeNumber } from "./booking";
import {
	configuredDealPricingParts,
	configuredDealTotals,
	dealDateKey,
	isFullyUpcomingDeal,
} from "./dealPolicy.mjs";

export const OFFERS_ROUTE = "/jannat-offers-monthly-reservations";

const MAX_FIXED_OFFER_NIGHTS = 45;
const MAX_FIXED_MONTHLY_NIGHTS = 75;

const HIJRI_MONTH_LABELS = [
	["muharram", "\u0645\u062d\u0631\u0645"],
	["safar", "\u0635\u0641\u0631"],
	["rabi al awal", "rabi al awwal", "\u0631\u0628\u064a\u0639 \u0627\u0644\u0627\u0648\u0644", "\u0631\u0628\u064a\u0639 \u0627\u0644\u0623\u0648\u0644"],
	["rabi al thani", "rabi al akhar", "\u0631\u0628\u064a\u0639 \u0627\u0644\u062b\u0627\u0646\u064a", "\u0631\u0628\u064a\u0639 \u0627\u0644\u0622\u062e\u0631"],
	["jumada al ula", "jumada al awal", "\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0627\u0648\u0644\u0649", "\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0623\u0648\u0644\u0649"],
	["jumada al thani", "jumada al akhar", "\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u062b\u0627\u0646\u064a\u0629", "\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0622\u062e\u0631\u0629"],
	["rajab", "\u0631\u062c\u0628"],
	["shaban", "shaaban", "sha'ban", "\u0634\u0639\u0628\u0627\u0646"],
	["ramadan", "\u0631\u0645\u0636\u0627\u0646"],
	["shawwal", "\u0634\u0648\u0627\u0644"],
	["dhu al qidah", "dhul qidah", "\u0630\u0648 \u0627\u0644\u0642\u0639\u062f\u0629", "\u0630\u0648\u0627\u0644\u0642\u0639\u062f\u0629"],
	["dhu al hijjah", "dhul hijjah", "\u0630\u0648 \u0627\u0644\u062d\u062c\u0629", "\u0630\u0648\u0627\u0644\u062d\u062c\u0629"],
];

const HIJRI_MONTHS = HIJRI_MONTH_LABELS.flatMap((labels, index) =>
	labels.map((label) => ({ label, month: index + 1 }))
);

const digitsToEnglish = (value = "") =>
	String(value || "")
		.replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
		.replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));

const normalizeHijriText = (value = "") =>
	digitsToEnglish(value)
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
		.replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
		.replace(/\u0649/g, "\u064a")
		.replace(/\u0629/g, "\u0647")
		.replace(/[_,.;:()[\]{}]/g, " ")
		.replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/g, "$1")
		.replace(/[-_/]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const normalizeHijriLabel = (value = "") =>
	normalizeHijriText(value).replace(/\bal\s+/g, "al ").replace(/\s+/g, " ").trim();

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hijriMonthFromText = (value = "") => {
	const normalized = normalizeHijriLabel(value);
	for (const entry of HIJRI_MONTHS) {
		const label = normalizeHijriLabel(entry.label);
		if (normalized === label || normalized.includes(label)) return entry.month;
	}
	return null;
};

const HIJRI_MONTH_REGEX_PART = Array.from(
	new Set(HIJRI_MONTHS.map((entry) => normalizeHijriLabel(entry.label)).filter(Boolean))
)
	.sort((a, b) => b.length - a.length)
	.map(escapeRegex)
	.join("|");

const isoFromParts = (year, month, day) => {
	const y = Number(year);
	const m = Number(month);
	const d = Number(day);
	if (!y || !m || !d) return null;
	return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

const hijriToJulianDay = (year, month, day) =>
	Math.floor((11 * year + 3) / 30) +
	354 * year +
	30 * month -
	Math.floor((month - 1) / 2) +
	day +
	1948440 -
	385;

const julianDayToGregorianISO = (julianDay) => {
	let l = Math.floor(julianDay) + 68569;
	const n = Math.floor((4 * l) / 146097);
	l -= Math.floor((146097 * n + 3) / 4);
	const i = Math.floor((4000 * (l + 1)) / 1461001);
	l = l - Math.floor((1461 * i) / 4) + 31;
	const j = Math.floor((80 * l) / 2447);
	const day = l - Math.floor((2447 * j) / 80);
	l = Math.floor(j / 11);
	const month = j + 2 - 12 * l;
	const year = 100 * (n - 49) + i + l;
	return isoFromParts(year, month, day);
};

const isoAddDays = (iso, offset) => {
	const date = new Date(`${iso}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + offset);
	return date.toISOString().slice(0, 10);
};

const intlHijriParts = (iso) => {
	try {
		const date = new Date(`${iso}T12:00:00Z`);
		const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
			timeZone: "UTC",
			day: "numeric",
			month: "numeric",
			year: "numeric",
		});
		const parts = formatter.formatToParts(date);
		const get = (type) =>
			Number(String(parts.find((part) => part.type === type)?.value || "").replace(/\D/g, ""));
		const year = get("year");
		const month = get("month");
		const day = get("day");
		return year && month && day ? { year, month, day } : null;
	} catch {
		return null;
	}
};

export const hijriToGregorianISO = (year, month, day) => {
	const y = Number(year);
	const m = Number(month);
	const d = Number(day);
	if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 30) return null;
	const civilISO = julianDayToGregorianISO(hijriToJulianDay(y, m, d));
	if (!civilISO) return null;
	for (let offset = -7; offset <= 7; offset += 1) {
		const candidate = isoAddDays(civilISO, offset);
		const parts = intlHijriParts(candidate);
		if (parts && parts.year === y && parts.month === m && parts.day === d) return candidate;
	}
	return civilISO;
};

const nextHijriYearForMonthDay = (month, day, baseISO = dayjs().format("YYYY-MM-DD")) => {
	const current = intlHijriParts(baseISO);
	if (!current) return null;
	let year = current.year;
	let candidate = hijriToGregorianISO(year, month, day);
	while (candidate && candidate < baseISO && year < current.year + 3) {
		year += 1;
		candidate = hijriToGregorianISO(year, month, day);
	}
	return candidate ? year : null;
};

const hijriMonthName = (month, isArabic = false) => {
	const labels = isArabic
		? [
				"\u0645\u062d\u0631\u0645",
				"\u0635\u0641\u0631",
				"\u0631\u0628\u064a\u0639 \u0627\u0644\u0623\u0648\u0644",
				"\u0631\u0628\u064a\u0639 \u0627\u0644\u0622\u062e\u0631",
				"\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0623\u0648\u0644\u0649",
				"\u062c\u0645\u0627\u062f\u0649 \u0627\u0644\u0622\u062e\u0631\u0629",
				"\u0631\u062c\u0628",
				"\u0634\u0639\u0628\u0627\u0646",
				"\u0631\u0645\u0636\u0627\u0646",
				"\u0634\u0648\u0627\u0644",
				"\u0630\u0648 \u0627\u0644\u0642\u0639\u062f\u0629",
				"\u0630\u0648 \u0627\u0644\u062d\u062c\u0629",
			]
		: [
				"Muharram",
				"Safar",
				"Rabi al-awwal",
				"Rabi al-thani",
				"Jumada al-ula",
				"Jumada al-thani",
				"Rajab",
				"Shaaban",
				"Ramadan",
				"Shawwal",
				"Dhu al-Qidah",
				"Dhu al-Hijjah",
			];
	return labels[Number(month) - 1] || "";
};

const formatHijriDisplay = (parts = {}, isArabic = false) => {
	const monthName = hijriMonthName(parts.month, isArabic);
	if (!monthName) return "";
	return isArabic
		? `${parts.day} ${monthName} ${parts.year}\u0647\u0640`
		: `${parts.day} ${monthName} ${parts.year} AH`;
};

const extractHijriDateMentions = (text = "") => {
	if (!HIJRI_MONTH_REGEX_PART) return [];
	const normalized = normalizeHijriText(text);
	const regex = new RegExp(`(\\d{1,2})\\s+(${HIJRI_MONTH_REGEX_PART})(?:\\s+(1[34]\\d{2}|15\\d{2}))?`, "gi");
	const mentions = [];
	let match = null;
	while ((match = regex.exec(normalized))) {
		const day = Number(match[1]);
		const month = hijriMonthFromText(match[2]);
		const year = match[3] ? Number(match[3]) : null;
		if (day >= 1 && day <= 30 && month) mentions.push({ day, month, year });
	}
	return mentions;
};

export const parseHijriDealRange = (text = "", options = {}) => {
	const source = [options.fromHijri, options.toHijri].filter(Boolean).length === 2
		? `${options.fromHijri} \u0627\u0644\u0649 ${options.toHijri}`
		: text;
	const mentions = extractHijriDateMentions(source);
	if (mentions.length < 2) return null;
	const [start, end] = mentions;
	const startYear = start.year || nextHijriYearForMonthDay(start.month, start.day, options.baseISO);
	if (!startYear) return null;
	let endYear = end.year || startYear;
	let checkIn = hijriToGregorianISO(startYear, start.month, start.day);
	let checkOut = hijriToGregorianISO(endYear, end.month, end.day);
	while (checkIn && checkOut && checkOut <= checkIn && endYear < startYear + 3) {
		endYear += 1;
		checkOut = hijriToGregorianISO(endYear, end.month, end.day);
	}
	if (!checkIn || !checkOut || checkOut <= checkIn) return null;
	const checkInHijri = { year: startYear, month: start.month, day: start.day };
	const checkOutHijri = { year: endYear, month: end.month, day: end.day };
	return {
		checkIn,
		checkOut,
		nights: Math.max(1, dayjs(checkOut).diff(dayjs(checkIn), "day")),
		checkInHijri,
		checkOutHijri,
		labelAr: `${formatHijriDisplay(checkInHijri, true)} \u0625\u0644\u0649 ${formatHijriDisplay(checkOutHijri, true)}`,
		labelEn: `${formatHijriDisplay(checkInHijri, false)} to ${formatHijriDisplay(checkOutHijri, false)}`,
	};
};

export const normalizeDealDate = (value = "") => {
	return dealDateKey(value);
};

export const toCommissionDecimal = (room = {}, hotel = {}) => {
	const normalize = (value) => (value <= 1 ? value : value / 100);
	const roomCommission = safeNumber(room?.roomCommission, NaN);
	const hotelCommission = safeNumber(hotel?.commission, NaN);
	const roomDecimal = Number.isFinite(roomCommission) && roomCommission > 0 ? normalize(roomCommission) : NaN;
	const hotelDecimal = Number.isFinite(hotelCommission) && hotelCommission > 0 ? normalize(hotelCommission) : NaN;
	if (Number.isFinite(roomDecimal) && roomDecimal >= 0.01) return roomDecimal;
	if (Number.isFinite(hotelDecimal)) return hotelDecimal;
	return 0.1;
};

export const normalizeOffer = (offer = {}) => {
	const base = safeNumber(offer?.offerPrice ?? offer?.price, 0);
	const root = safeNumber(offer?.offerRootPrice ?? offer?.rootPrice ?? offer?.cost, 0);
	const name = offer?.offerName || offer?.name || "Special offer";
	const hijriRange = parseHijriDealRange(name);
	return {
		type: "offer",
		id: String(offer?._id || offer?.id || `${name}-${base}-${root}`),
		name,
		from: normalizeDealDate(offer?.offerFrom || offer?.from || offer?.validFrom),
		to: normalizeDealDate(offer?.offerTo || offer?.to || offer?.validTo),
		hijriRange,
		base,
		root,
	};
};

export const normalizeMonthlyDeal = (monthly = {}) => {
	const monthBase = safeNumber(monthly?.monthPrice ?? monthly?.price ?? monthly?.rate, 0);
	const monthRoot = safeNumber(monthly?.monthRootPrice ?? monthly?.rootPrice ?? monthly?.cost, 0);
	const name = monthly?.monthName || monthly?.monthlyName || monthly?.name || "Monthly package";
	const hijriRange = parseHijriDealRange(name, {
		fromHijri: monthly?.monthFromHijri,
		toHijri: monthly?.monthToHijri,
	});
	return {
		type: "monthly",
		id: String(monthly?._id || monthly?.id || `${name}-${monthBase}-${monthRoot}`),
		name,
		from: normalizeDealDate(monthly?.monthFrom || monthly?.from || monthly?.validFrom),
		to: normalizeDealDate(monthly?.monthTo || monthly?.to || monthly?.validTo),
		hijriRange,
		monthBase,
		monthRoot,
	};
};

const offerIsPubliclyUpcoming = (offer = {}) => {
	const deal = normalizeOffer(offer);
	return deal.base > 0 && isFullyUpcomingDeal(deal);
};

const monthlyIsPubliclyUpcoming = (monthly = {}) => {
	const deal = normalizeMonthlyDeal(monthly);
	return deal.monthBase > 0 && isFullyUpcomingDeal(deal);
};

export const withUpcomingDealsOnly = (hotel = {}) => ({
	...hotel,
	roomCountDetails: (Array.isArray(hotel?.roomCountDetails) ? hotel.roomCountDetails : []).map((room) => ({
		...room,
		offers: (Array.isArray(room?.offers) ? room.offers : []).filter(offerIsPubliclyUpcoming),
		monthly: (Array.isArray(room?.monthly) ? room.monthly : []).filter(monthlyIsPubliclyUpcoming),
	})),
});

export const upcomingDealHotelsOnly = (hotels = []) =>
	(Array.isArray(hotels) ? hotels : [])
		.map(withUpcomingDealsOnly)
		.filter((hotel) => hotelHasDeals(hotel));

export const roomDealGroups = (hotel = {}) =>
	(Array.isArray(hotel?.roomCountDetails) ? hotel.roomCountDetails : [])
		.map((room) => {
			const offers = (Array.isArray(room?.offers) ? room.offers : [])
				.map(normalizeOffer)
				.filter((deal) => deal.base > 0)
				.filter((deal) => isFullyUpcomingDeal(deal));
			const monthly = (Array.isArray(room?.monthly) ? room.monthly : [])
				.map(normalizeMonthlyDeal)
				.filter((deal) => deal.monthBase > 0)
				.filter((deal) => isFullyUpcomingDeal(deal));
			return { room, offers, monthly, deals: [...offers, ...monthly] };
		})
		.filter((group) => group.deals.length);

export const hotelHasDeals = (hotel = {}) => roomDealGroups(hotel).length > 0;

export const hotelsHaveDeals = (hotels = []) =>
	(Array.isArray(hotels) ? hotels : []).some((hotel) => hotelHasDeals(hotel));

export const countHotelDeals = (hotel = {}) =>
	roomDealGroups(hotel).reduce((total, group) => total + group.deals.length, 0);

export const dealTotalSar = (deal = {}, _commission = 0.1, nights = 1) =>
	configuredDealTotals(deal, nights).guestTotal;

export const dealNightlySar = (deal = {}, commission = 0.1, nights = 1) =>
	dealTotalSar(deal, commission, nights) / Math.max(1, safeNumber(nights, 1));

export const resolveDealStay = (deal = {}, fallbackDates = {}) => {
	if (deal.hijriRange?.checkIn && deal.hijriRange?.checkOut) {
		return {
			checkIn: deal.hijriRange.checkIn,
			checkOut: deal.hijriRange.checkOut,
			nights: deal.hijriRange.nights,
			locked: true,
			usesSelectedStayDates: false,
			hijriRange: deal.hijriRange,
		};
	}

	const from = normalizeDealDate(deal.from);
	const to = normalizeDealDate(deal.to);
	const rangeNights = from && to ? dayjs(to).diff(dayjs(from), "day") : 0;
	const maxFixedNights = deal.type === "monthly" ? MAX_FIXED_MONTHLY_NIGHTS : MAX_FIXED_OFFER_NIGHTS;
	const fromYear = from ? Number(from.slice(0, 4)) : 0;
	const currentYear = dayjs().year();
	if (rangeNights >= 1 && rangeNights <= maxFixedNights && fromYear <= currentYear + 5) {
		return {
			checkIn: from,
			checkOut: to,
			nights: rangeNights,
			locked: true,
			usesSelectedStayDates: false,
		};
	}

	const fallbackCheckIn = normalizeDealDate(fallbackDates.checkIn) || dayjs().add(1, "day").format("YYYY-MM-DD");
	const rawFallbackCheckOut = normalizeDealDate(fallbackDates.checkOut) || dayjs(fallbackCheckIn).add(3, "day").format("YYYY-MM-DD");
	const fallbackCheckOut = dayjs(rawFallbackCheckOut).isAfter(dayjs(fallbackCheckIn), "day")
		? rawFallbackCheckOut
		: dayjs(fallbackCheckIn).add(1, "day").format("YYYY-MM-DD");
	return {
		checkIn: fallbackCheckIn,
		checkOut: fallbackCheckOut,
		nights: Math.max(1, dayjs(fallbackCheckOut).diff(dayjs(fallbackCheckIn), "day")),
		locked: true,
		usesSelectedStayDates: false,
		needsDateConfirmation: true,
	};
};

export const buildDealPricingRows = (deal = {}, commission = 0.1, checkIn, checkOut) => {
	const dates = generateDateRange(checkIn, checkOut);
	const nights = Math.max(1, dates.length);
	const parts = configuredDealPricingParts(deal, nights, commission);
	return dates.map((date, index) => ({
		date,
		price: parts[index]?.priceBeforeCommission || 0,
		rootPrice: parts[index]?.rootPrice || 0,
		commissionRate: commission,
		totalPriceWithoutCommission: parts[index]?.priceBeforeCommission || 0,
		totalPriceWithCommission: parts[index]?.guestPrice || 0,
	}));
};
