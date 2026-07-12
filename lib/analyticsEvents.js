import { sanitizeSensitiveUrl } from "./urlPrivacy";

const eventMap = {
	search: {
		ga: "search",
		fb: "Search",
	},
	selectItem: {
		ga: "select_item",
		fb: "ViewContent",
	},
	viewContent: {
		ga: "view_item",
		fb: "ViewContent",
	},
	viewHotel: {
		ga: "view_item",
		fb: "ViewContent",
	},
	addToCart: {
		ga: "add_to_cart",
		fb: "AddToCart",
	},
	beginCheckout: {
		ga: "begin_checkout",
		fb: "InitiateCheckout",
	},
	lead: {
		ga: "generate_lead",
		fb: "Lead",
	},
	contact: {
		ga: "contact",
		fb: "Contact",
	},
	contactSubmit: {
		ga: "generate_lead",
		fb: "Lead",
	},
	reservationRequest: {
		ga: "generate_lead",
		fb: "Lead",
	},
	reservationPayment: {
		ga: "purchase",
		fb: "Purchase",
	},
	paymentLinkView: {
		ga: "begin_checkout",
		fb: "InitiateCheckout",
	},
	paymentOption: {
		ga: "add_payment_info",
		fb: "AddPaymentInfo",
	},
	paymentClick: {
		ga: "add_payment_info",
		fb: "AddPaymentInfo",
	},
	termsAccepted: {
		ga: "terms_accepted",
	},
	chatOpen: {
		ga: "generate_lead",
		fb: "Lead",
	},
	chatStart: {
		ga: "generate_lead",
		fb: "Lead",
	},
	currencyChange: {
		ga: "currency_change",
	},
	promoClick: {
		ga: "select_promotion",
	},
};

const privatePayloadKeyNames = new Set([
	"contact",
	"contactnumber",
	"customeremail",
	"customername",
	"customerphone",
	"email",
	"emailaddress",
	"fullname",
	"guestemail",
	"guestname",
	"guestphone",
	"name",
	"phone",
	"telephone",
]);

const isPrivatePayloadKey = (key = "") => {
	const normalized = String(key).replace(/[^a-z0-9]/gi, "").toLowerCase();
	if (privatePayloadKeyNames.has(normalized)) return true;
	return /(email|phone|telephone|fullname|guestname|guestemail|guestphone|customername|customeremail|customerphone)$/.test(
		normalized
	);
};

const eventId = (type = "event") =>
	`jb_${String(type || "event").replace(/[^a-z0-9_]/gi, "_")}_${Date.now()}_${Math.random()
		.toString(36)
		.slice(2, 9)}`;

const normalizeValue = (value) => {
	if (value === undefined || value === null || value === "") return undefined;
	if (typeof value === "number") return Number.isFinite(value) ? Number(value.toFixed(2)) : undefined;
	const parsed = Number(String(value).replace(/,/g, ""));
	return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : value;
};

const normalizeItem = (item = {}) => {
	const normalized = {
		item_id: item.item_id || item.id || item.roomId || item.hotel_id || item.hotelId,
		item_name: item.item_name || item.name || item.roomName || item.hotelName || item.content_name,
		item_category: item.item_category || item.category || item.hotelName || item.content_type,
		quantity: normalizeValue(item.quantity || item.amount || 1),
		price: normalizeValue(item.price || item.value),
	};
	return Object.fromEntries(
		Object.entries(normalized).filter(([, value]) => value !== undefined && value !== null && value !== "")
	);
};

const normalizePayload = (type, payload = {}) => {
	const rawItems = Array.isArray(payload.items) ? payload.items : [];
	const items = rawItems.map(normalizeItem).filter((item) => item.item_id || item.item_name);
	const cleanPayload = Object.fromEntries(
		Object.entries(payload || {})
			.filter(([key, value]) => !isPrivatePayloadKey(key) && value !== undefined && value !== null && value !== "")
			.map(([key, value]) => [key, key === "value" || key.endsWith("_value") ? normalizeValue(value) : value])
	);
	if (items.length) {
		cleanPayload.items = items;
		cleanPayload.content_ids = items.map((item) => item.item_id).filter(Boolean);
		cleanPayload.contents = items.map((item) => ({
			id: item.item_id || item.item_name,
			quantity: item.quantity || 1,
			item_price: item.price,
		}));
	}
	if (cleanPayload.value !== undefined && !cleanPayload.currency) cleanPayload.currency = "SAR";
	if (!cleanPayload.event_source && typeof window !== "undefined") {
		cleanPayload.event_source = "jannatbooking_ssr";
		cleanPayload.event_source_url = sanitizeSensitiveUrl(window.location.href);
	}
	cleanPayload.event_id = cleanPayload.event_id || eventId(type);
	return cleanPayload;
};

export const trackConversion = (type, payload = {}, legacyNames = []) => {
	if (typeof window === "undefined") return;
	const event = eventMap[type];
	const cleanPayload = normalizePayload(type, payload);

	if (event?.ga && typeof window.gtag === "function") {
		window.gtag("event", event.ga, cleanPayload);
	}
	if (event?.fb && typeof window.fbq === "function") {
		window.fbq("track", event.fb, cleanPayload, { eventID: cleanPayload.event_id });
	}
	legacyNames.forEach((name) => {
		if (!name) return;
		if (typeof window.gtag === "function") {
			window.gtag("event", name, cleanPayload);
		}
		if (typeof window.fbq === "function") {
			window.fbq("trackCustom", name, cleanPayload, { eventID: cleanPayload.event_id });
		}
	});
};
