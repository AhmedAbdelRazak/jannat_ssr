import { COUNTRY_OPTIONS } from "./countries.js";

export const safeReceiptNumber = (value) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
};

const normalizeCountryText = (value) =>
	String(value || "")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[_.,()]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();

const NATIONALITY_ALIASES = Object.freeze({
	egyptian: "EG", saudi: "SA", "saudi arabian": "SA", emirati: "AE",
	american: "US", british: "GB", pakistani: "PK", indian: "IN",
	bangladeshi: "BD", indonesian: "ID", malaysian: "MY", turkish: "TR",
	jordanian: "JO", palestinian: "PS", syrian: "SY", iraqi: "IQ",
	yemeni: "YE", sudanese: "SD", nigerian: "NG", moroccan: "MA",
	"مصري": "EG", "مصرية": "EG", "سعودي": "SA", "سعودية": "SA",
	"إماراتي": "AE", "إماراتية": "AE", "باكستاني": "PK", "باكستانية": "PK",
	"فلسطيني": "PS", "فلسطينية": "PS", "سوري": "SY", "سورية": "SY",
});

const countryNameIndex = new Map(
	COUNTRY_OPTIONS.map((country) => [normalizeCountryText(country.name), country.code]),
);
countryNameIndex.set("united states of america", "US");
countryNameIndex.set("united kingdom of great britain and northern ireland", "GB");
countryNameIndex.set("uae", "AE");
countryNameIndex.set("ksa", "SA");
const validCountryCodes = new Set(COUNTRY_OPTIONS.map((country) => country.code));

export const countryCodeFromNationality = (value) => {
	const normalized = normalizeCountryText(value);
	if (!normalized) return "";
	const code = normalized.toUpperCase();
	if (/^[A-Z]{2}$/.test(code) && validCountryCodes.has(code)) return code;
	return NATIONALITY_ALIASES[normalized] || countryNameIndex.get(normalized) || "";
};

export const displayNationality = (value, code = countryCodeFromNationality(value)) => {
	const raw = String(value || "").trim();
	if (raw && !/^[A-Za-z]{2}$/.test(raw)) return raw;
	if (!code) return raw || "N/A";
	const preferred = { EG: "Egyptian", SA: "Saudi Arabian", AE: "Emirati", US: "American", GB: "British" };
	return preferred[code] || COUNTRY_OPTIONS.find((country) => country.code === code)?.name || raw;
};

export const calculateReceiptNights = (checkin, checkout) => {
	const start = new Date(checkin);
	const end = new Date(checkout);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
	const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
	const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
	return Math.max(1, Math.round((endDay - startDay) / 86400000));
};

export const formatReceiptDate = (value, locale = "en-US") => {
	const date = new Date(value);
	if (!value || Number.isNaN(date.getTime())) return "N/A";
	return new Intl.DateTimeFormat(locale, {
		timeZone: "UTC",
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date);
};

const normalizeRoomKey = (value) =>
	String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

const roomDefinition = (room, hotel) => {
	const definitions = Array.isArray(hotel?.roomCountDetails) ? hotel.roomCountDetails : [];
	const typeKey = normalizeRoomKey(room?.room_type || room?.roomType);
	const nameKey = normalizeRoomKey(room?.displayName || room?.display_name);
	return definitions.find((definition) => {
		const definitionType = normalizeRoomKey(definition?.roomType || definition?.room_type);
		const definitionName = normalizeRoomKey(definition?.displayName || definition?.display_name);
		return (typeKey && typeKey === definitionType) || (nameKey && nameKey === definitionName);
	});
};

const dayPrice = (day) => {
	const candidates = [day?.totalPriceWithCommission, day?.price, day?.clientPrice, day?.sellingPrice];
	const value = candidates.find((candidate) => candidate !== null && candidate !== undefined && Number.isFinite(Number(candidate)));
	return value === undefined ? null : safeReceiptNumber(value);
};

export const buildReceiptRoomRows = (reservation, hotel, nights) => {
	const rooms = Array.isArray(reservation?.pickedRoomsType) ? reservation.pickedRoomsType : [];
	const grouped = new Map();
	rooms.forEach((room) => {
		const definition = roomDefinition(room, hotel);
		const englishName = room?.displayName || room?.display_name || definition?.displayName || room?.room_type || room?.roomType || "Room";
		const arabicName = room?.displayName_OtherLanguage || room?.displayNameArabic || definition?.displayName_OtherLanguage || "";
		const prices = (Array.isArray(room?.pricingByDay) ? room.pricingByDay : []).map(dayPrice).filter((price) => price !== null);
		const chosenPrice = safeReceiptNumber(room?.chosenPrice);
		const rate = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : chosenPrice;
		const unitTotal = prices.length ? prices.reduce((sum, price) => sum + price, 0) : rate * nights;
		const count = Math.max(1, Math.round(safeReceiptNumber(room?.count) || 1));
		const key = [normalizeRoomKey(room?.room_type || room?.roomType || englishName), normalizeRoomKey(englishName), rate.toFixed(2), unitTotal.toFixed(2)].join("|");
		const existing = grouped.get(key);
		if (existing) {
			existing.count += count;
			existing.total += unitTotal * count;
		} else {
			grouped.set(key, { englishName, arabicName, count, rate, total: unitTotal * count });
		}
	});
	return Array.from(grouped.values());
};

export const deriveReceiptPayment = (reservation) => {
	const total = safeReceiptNumber(reservation?.total_amount);
	const status = String(reservation?.payment || "").trim().toLowerCase();
	const notCaptured = ["credit/ debit", "credit/debit", "credit / debit", "not captured"].includes(status);
	const online = notCaptured ? 0 : safeReceiptNumber(reservation?.paid_amount);
	const offline = safeReceiptNumber(reservation?.payment_details?.onsite_paid_amount);
	const paid = Math.max(0, online + offline);
	const remaining = Math.max(0, total - paid);
	const fullyPaid = paid > 0 && Math.round(paid * 100) >= Math.round(total * 100);
	let method = { en: "Not paid", ar: "غير مدفوع", tone: "unpaid" };
	if (notCaptured) method = { en: "Not captured", ar: "غير محصل", tone: "pending" };
	else if (fullyPaid) method = { en: "Paid", ar: "مدفوع", tone: "paid" };
	else if (paid > 0) method = offline > 0
		? { en: "Paid at property", ar: "مدفوع في الفندق", tone: "partial" }
		: { en: "Deposit", ar: "عربون", tone: "partial" };
	return { total, paid, remaining, method };
};

const STATUS_AR = Object.freeze({
	confirmed: "مؤكد", inhouse: "مقيم", "in house": "مقيم",
	"pending confirmation": "بانتظار التأكيد", pending: "قيد الانتظار",
	cancelled: "ملغي", canceled: "ملغي", completed: "مكتمل", "checked out": "تمت المغادرة",
});

export const receiptStatus = (value) => {
	const en = String(value || "Confirmed").trim() || "Confirmed";
	const normalized = en.toLowerCase();
	return {
		en,
		ar: STATUS_AR[normalized] || "حالة الحجز",
		positive: ["confirmed", "inhouse", "in house", "completed"].includes(normalized),
	};
};

const CODE39 = Object.freeze({
	"0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn",
	A:"wnnnnwnnw",B:"nnwnnwnnw",C:"wnwnnwnnn",D:"nnnnwwnnw",E:"wnnnwwnnn",F:"nnwnwwnnn",G:"nnnnnwwnw",H:"wnnnnwwnn",I:"nnwnnwwnn",J:"nnnnwwwnn",K:"wnnnnnnww",L:"nnwnnnnww",M:"wnwnnnnwn",N:"nnnnwnnww",O:"wnnnwnnwn",P:"nnwnwnnwn",Q:"nnnnnnwww",R:"wnnnnnwwn",S:"nnwnnnwwn",T:"nnnnwnwwn",U:"wwnnnnnnw",V:"nwwnnnnnw",W:"wwwnnnnnn",X:"nwnnwnnnw",Y:"wwnnwnnnn",Z:"nwwnwnnnn",
	"-":"nwnnnnwnw",".":"wwnnnnwnn"," ":"nwwnnnwnn","$":"nwnwnwnnn","/":"nwnwnnnwn","+":"nwnnnwnwn","%":"nnnwnwnwn","*":"nwnnwnwnn",
});

export const code39Bars = (value) => {
	const normalized = String(value || "N/A").toUpperCase().replace(/[^0-9A-Z. $/+%-]/g, "-").slice(0, 32);
	const bars = [];
	let cursor = 10;
	`*${normalized}*`.split("").forEach((character) => {
		(CODE39[character] || CODE39["-"]).split("").forEach((widthCode, index) => {
			const width = widthCode === "w" ? 3 : 1;
			if (index % 2 === 0) bars.push({ x: cursor, width });
			cursor += width;
		});
		cursor += 1;
	});
	return { bars, width: cursor + 9, normalized };
};
