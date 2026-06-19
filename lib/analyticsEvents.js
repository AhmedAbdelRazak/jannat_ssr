const eventMap = {
	search: {
		ga: "search",
		fb: "Search",
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
		ga: "purchase",
		fb: "Purchase",
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

export const trackConversion = (type, payload = {}, legacyNames = []) => {
	if (typeof window === "undefined") return;
	const event = eventMap[type];
	const cleanPayload = Object.fromEntries(
		Object.entries(payload || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
	);

	if (event?.ga && typeof window.gtag === "function") {
		window.gtag("event", event.ga, cleanPayload);
	}
	if (event?.fb && typeof window.fbq === "function") {
		window.fbq("track", event.fb, cleanPayload);
	}
	legacyNames.forEach((name) => {
		if (!name) return;
		if (typeof window.gtag === "function") {
			window.gtag("event", name, cleanPayload);
		}
		if (typeof window.fbq === "function") {
			window.fbq("trackCustom", name, cleanPayload);
		}
	});
};
