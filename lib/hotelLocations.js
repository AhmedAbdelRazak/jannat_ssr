export const HOTEL_DESTINATIONS = [
	{
		value: "Makkah",
		label: { en: "Makkah", ar: "مكة" },
		aliases: [
			"makkah",
			"mecca",
			"mekkah",
			"makkah province",
			"makkah al mukarramah",
			"مكة",
			"مكه",
			"مكة المكرمة",
			"مكه المكرمه",
		],
	},
	{
		value: "Madinah",
		label: { en: "Madinah", ar: "المدينة المنورة" },
		aliases: [
			"madinah",
			"madina",
			"medina",
			"al madinah",
			"al madina",
			"al medina",
			"al madinah province",
			"المدينة",
			"المدينه",
			"المدينة المنورة",
			"المدينه المنوره",
		],
	},
];

const cleanLocationValue = (value = "") =>
	String(value || "")
		.normalize("NFKC")
		.replace(/[\u064B-\u065F\u0670\u0640]/g, "")
		.trim()
		.toLowerCase();

export const normalizeHotelDestination = (value = "") => {
	const normalized = cleanLocationValue(value);
	if (!normalized) return "";
	if (/(^|\s)(makkah|mecca|mekkah)(\s|$)/.test(normalized) || /مك[هة]/.test(normalized)) {
		return "Makkah";
	}
	if (/(^|\s)(madinah|madina|medina)(\s|$)/.test(normalized) || /المدين[هة]/.test(normalized)) {
		return "Madinah";
	}
	const match = HOTEL_DESTINATIONS.find(
		(destination) =>
			cleanLocationValue(destination.value) === normalized ||
			destination.aliases.map(cleanLocationValue).includes(normalized)
	);
	return match?.value || "";
};

export const hotelDestinationLabel = (value = "", isArabic = false) => {
	const canonical = normalizeHotelDestination(value);
	const match = HOTEL_DESTINATIONS.find((destination) => destination.value === canonical);
	return match?.label[isArabic ? "ar" : "en"] || "";
};

export const hotelDestinationOptions = (isArabic = false) =>
	HOTEL_DESTINATIONS.map((destination) => ({
		value: destination.value,
		label: destination.label[isArabic ? "ar" : "en"],
	}));
