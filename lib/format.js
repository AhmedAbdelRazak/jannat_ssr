import { ROOM_TYPE_LABELS } from "./constants";
import { hotelDestinationLabel } from "./hotelLocations";

export const slugifyHotel = (name = "") =>
	encodeURIComponent(
		String(name || "")
			.trim()
			.replace(/\s+/g, "-")
			.toLowerCase()
	);

export const titleCase = (value = "") =>
	String(value || "")
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase()
		.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

export const roomTypeLabel = (roomType = "") =>
	ROOM_TYPE_LABELS[roomType] || titleCase(roomType || "Room");

export const sar = (value = 0) => {
	const amount = Number(value || 0);
	if (!Number.isFinite(amount) || amount <= 0) return "Price on request";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "SAR",
		maximumFractionDigits: 0,
	}).format(amount);
};

export const stripHtml = (value = "") =>
	String(value || "")
		.replace(/<br\s*\/?>/gi, " ")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();

export const isUsableImage = (value = "") => {
	const url = typeof value === "string" ? value : value?.url || "";
	if (!url) return false;
	return !/(^|\/)(missing|default-room)\.(png|jpe?g|webp)$/i.test(url) && !url.includes("/_fallbacks/");
};

export const firstImage = (...candidates) => {
	for (const candidate of candidates) {
		if (typeof candidate === "string" && isUsableImage(candidate)) return candidate;
		if (candidate?.url && isUsableImage(candidate.url)) return candidate.url;
		if (Array.isArray(candidate)) {
			const found = candidate.find((item) => isUsableImage(item));
			if (typeof found === "string") return found;
			if (found?.url) return found.url;
		}
	}
	return "";
};

const formatLocationPart = (value = "") => {
	const text = String(value || "").trim();
	if (!text) return "";
	if (text.toLowerCase() === "ksa") return "KSA";
	return hotelDestinationLabel(text, false) || titleCase(text);
};

export const hotelLocation = (hotel = {}) => {
	const parts = [hotel.hotelCity, hotel.hotelState, hotel.hotelCountry]
		.map(formatLocationPart)
		.filter(Boolean);
	return [...new Set(parts)].join(", ");
};

const distanceValue = (value) => {
	const text = String(value ?? "").trim();
	if (!text || text === "0" || /^n\/?a$/i.test(text)) return "";
	if (/^\d+(\.\d+)?$/.test(text)) return `${text} min`;
	return text;
};

export const walkingDistanceOnly = (hotel = {}) =>
	distanceValue(hotel?.distances?.walkingToElHaram);

export const drivingDistance = (hotel = {}) =>
	distanceValue(hotel?.distances?.drivingToElHaram);

export const walkingDistance = (hotel = {}) =>
	walkingDistanceOnly(hotel) || drivingDistance(hotel) || "";
