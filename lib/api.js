import {
	ARABIC_BRAND_NAME,
	CONTACT_EMAIL,
	DEFAULT_FOOTER_IMAGE,
	DEFAULT_HERO_IMAGES,
	DEFAULT_LOGO,
	OFFICIAL_EMAIL,
	PHONE_DISPLAY,
	WHATSAPP_NUMBER,
} from "./constants";

const PUBLIC_API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://xhotelpro.com/api";
const SERVER_API_BASE =
	process.env.SERVER_API_URL ||
	process.env.API_URL ||
	PUBLIC_API_BASE;
const API_BASE = typeof window === "undefined" ? SERVER_API_BASE : PUBLIC_API_BASE;
const DEV_API_BASE = process.env.NEXT_PUBLIC_DEV_API_URL || "http://localhost:8080/api";
const DEFAULT_FETCH_TIMEOUT_MS = Number(process.env.API_FETCH_TIMEOUT_MS) || 3500;
const DEFAULT_MUTATION_TIMEOUT_MS =
	Number(process.env.NEXT_PUBLIC_API_MUTATION_TIMEOUT_MS) ||
	Number(process.env.API_MUTATION_TIMEOUT_MS) ||
	10000;

const normalizePath = (path = "") => (path.startsWith("/") ? path : `/${path}`);

export const apiUrl = (path = "") => `${API_BASE}${normalizePath(path)}`;
export const apiBaseUrl = API_BASE;
export const absoluteApiUrl = (base = API_BASE, path = "") =>
	`${String(base || "").replace(/\/+$/, "")}${normalizePath(path)}`;
export const socketBaseUrl =
	process.env.NEXT_PUBLIC_SOCKET_URL ||
	API_BASE.replace(/\/+$/, "").replace(/\/api$/i, "");

async function fetchJsonUrl(
	url,
	{ revalidate = 60, cache = undefined, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS } = {}
) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			...(cache ? { cache } : { next: { revalidate } }),
			headers: { Accept: "application/json" },
			signal: controller.signal,
		});
		const contentType = res.headers.get("content-type") || "";
		if (!contentType.includes("application/json")) return null;
		const text = await res.text();
		const data = text ? JSON.parse(text) : null;
		if (!res.ok) return null;
		return data;
	} catch (error) {
		console.error(`Jannat API fetch failed for ${url}:`, error);
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchJson(path, options = {}) {
	return fetchJsonUrl(apiUrl(path), options);
}

async function requestJson(path, options = {}) {
	const {
		timeoutMs = DEFAULT_MUTATION_TIMEOUT_MS,
		signal,
		...fetchOptions
	} = options;
	const controller =
		!signal && Number(timeoutMs) > 0 ? new AbortController() : null;
	const timeout = controller
		? setTimeout(() => controller.abort(), Number(timeoutMs))
		: null;
	try {
		const res = await fetch(apiUrl(path), {
			...fetchOptions,
			headers: {
				Accept: "application/json",
				...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
				...(fetchOptions.headers || {}),
			},
			...(signal || controller ? { signal: signal || controller.signal } : {}),
		});
		const text = await res.text();
		let data = {};
		try {
			data = text ? JSON.parse(text) : {};
		} catch {
			data = { message: text || "" };
		}
		if (!res.ok) {
			const error = new Error(data?.message || data?.error || `Request failed (${res.status})`);
			error.status = res.status;
			error.response = data;
			throw error;
		}
		return data;
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

export const postJson = (path, payload = {}, options = {}) =>
	requestJson(path, {
		method: "POST",
		body: JSON.stringify(payload),
		...options,
	});

export const putJson = (path, payload = {}, options = {}) =>
	requestJson(path, {
		method: "PUT",
		body: JSON.stringify(payload),
		...options,
	});

export const getJson = (path, options = {}) =>
	requestJson(path, {
		method: "GET",
		...options,
	});

export const websiteDefaults = {
	siteName: "Jannat Booking",
	janatLogo: { url: DEFAULT_LOGO },
	homeMainBanners: DEFAULT_HERO_IMAGES.map((url, index) => ({
		url,
		title:
			index === 0
				? "Jannat Booking"
				: index === 1
					? "Makkah and Madinah Stays"
					: "Designed Around Your Trip",
		titleArabic:
			index === 0
				? ARABIC_BRAND_NAME
				: index === 1
					? "فنادق مكة والمدينة"
					: "رحلة أسهل من البداية",
		subTitle:
			index === 0
				? "Book selected hotels for Umrah, Haj, and city stays with responsive support."
				: index === 1
					? "Compare rooms, dates, distance to Al Haram, and pricing with confidence."
					: "Find the room type and hotel setting that fits your plans.",
		subTitleArabic:
			index === 0
				? "احجز فنادق مختارة للعمرة والحج والإقامات السياحية مع دعم سريع."
				: index === 1
					? "قارن الغرف والتواريخ والمسافة إلى الحرم والأسعار بثقة."
					: "اعثر على نوع الغرفة والفندق المناسب لخطتك.",
		buttonTitle: index === 2 ? "View Rooms" : "Explore Hotels",
		buttonTitleArabic: index === 2 ? "عرض الغرف" : "استكشف الفنادق",
		pageRedirectURL: index === 2 ? "/rooms" : "/our-hotels",
		btnBackgroundColor: ["#b48a34", "#17395f", "#0f8f70"][index],
	})),
	homeSecondBanner: { url: DEFAULT_HERO_IMAGES[1] },
	homeThirdBanner: { url: DEFAULT_HERO_IMAGES[2] },
	aboutUsBanner: { url: DEFAULT_HERO_IMAGES[1] },
	contactUsBanner: { url: DEFAULT_HERO_IMAGES[0] },
	footerBanner: {
		public_id: "jannat/defaults/footer",
		url: DEFAULT_FOOTER_IMAGE,
	},
	aboutUsEnglish:
		"<h1>Jannat Booking</h1><p>Jannat Booking helps pilgrims and travelers book Makkah and Madinah hotels with clear room choices, date-based pricing, and responsive support. The platform displays its reservation activity transparently from the system.</p>",
	aboutUsArabic:
		`<h1>${ARABIC_BRAND_NAME}</h1><p>تساعد ${ARABIC_BRAND_NAME} الحجاج والمعتمرين والمسافرين في حجز فنادق مكة والمدينة مع خيارات غرف واضحة وأسعار حسب التواريخ ودعم سريع وسجل حجوزات يتم عرضه بشفافية من النظام.</p>`,
	termsAndConditionEnglish:
		"<h2>Guest Terms and Conditions</h2><p>Hotel availability, rates, payment options, cancellation handling, and final confirmation depend on the selected hotel, room type, and travel dates. Jannat Booking support will help confirm the details before the reservation is finalized.</p>",
	termsAndConditionArabic:
		`<h2>الشروط والأحكام للضيوف</h2><p>يعتمد التوفر والأسعار وخيارات الدفع وسياسة الإلغاء والتأكيد النهائي على الفندق المختار ونوع الغرفة وتواريخ السفر. يساعدك دعم ${ARABIC_BRAND_NAME} في تأكيد التفاصيل قبل إتمام الحجز.</p>`,
	termsAndConditionEnglish_B2B:
		"<h2>Hotel Partner Terms</h2><p>Partner hotels are responsible for accurate room availability, pricing, policies, taxes, and operational updates shared with Jannat Booking.</p>",
	termsAndConditionArabic_B2B:
		`<h2>شروط شركاء الفنادق</h2><p>تتحمل الفنادق الشريكة مسؤولية دقة التوفر والأسعار والسياسات والضرائب والتحديثات التشغيلية التي تتم مشاركتها مع ${ARABIC_BRAND_NAME}.</p>`,
	privacyPolicy:
		"<h2>Privacy Policy</h2><p>Jannat Booking uses guest and reservation information to process booking requests, communicate with hotels, support payments, and provide customer service.</p>",
	privacyPolicyArabic:
		`<h2>سياسة الخصوصية</h2><p>تستخدم ${ARABIC_BRAND_NAME} بيانات الضيوف والحجوزات لمعالجة طلبات الحجز والتواصل مع الفنادق ودعم المدفوعات وخدمة العملاء.</p>`,
	contactEmail: CONTACT_EMAIL,
	officialEmail: OFFICIAL_EMAIL,
	phone: PHONE_DISPLAY,
	whatsappNumber: WHATSAPP_NUMBER,
};

export async function getWebsite() {
	const data = await fetchJson("/janat-website-document", { revalidate: 120 });
	const doc = Array.isArray(data) ? data[data.length - 1] : data;
	return { ...websiteDefaults, ...(doc || {}) };
}

export async function getPublicReservationStats() {
	const urls = [
		apiUrl("/public-reservation-stats"),
		...(process.env.NODE_ENV !== "production"
			? [absoluteApiUrl(DEV_API_BASE, "/public-reservation-stats")]
			: []),
	];

	for (const url of [...new Set(urls)]) {
		const data = await fetchJsonUrl(url, { revalidate: 300, timeoutMs: 2400 });
		const reservationsCount = Number(data?.reservationsCount);
		if (Number.isFinite(reservationsCount) && reservationsCount > 0) {
			return {
				reservationsCount,
				generatedAt: data?.generatedAt || null,
			};
		}
	}

	return { reservationsCount: null, generatedAt: null };
}

export async function getHotels() {
	const data = await fetchJson("/active-hotel-list", { revalidate: 60 });
	return Array.isArray(data) ? data : [];
}

export async function getFeaturedHotels() {
	const data = await fetchJson("/active-hotels", { revalidate: 60 });
	return Array.isArray(data) ? data : [];
}

export async function getRoomTypes() {
	const data = await fetchJson("/distinct-rooms", { revalidate: 120 });
	return Array.isArray(data) ? data : [];
}

export async function getHotelBySlug(slug) {
	return fetchJson(`/single-hotel/${encodeURIComponent(slug)}`, {
		revalidate: 60,
	});
}

export async function getHotelReviewsBySlug(
	slug,
	{ page = 1, limit = 6, cache = "no-store", timeoutMs = DEFAULT_FETCH_TIMEOUT_MS } = {}
) {
	const safePage = Math.max(1, Math.trunc(Number(page) || 1));
	const safeLimit = Math.max(1, Math.min(20, Math.trunc(Number(limit) || 6)));
	const params = new URLSearchParams({
		page: String(safePage),
		limit: String(safeLimit),
	});
	return fetchJson(
		`/hotel-reviews/hotel/${encodeURIComponent(slug)}?${params.toString()}`,
		{ cache, timeoutMs }
	);
}

export function getHotelReviewsPageBySlug(slug, { page = 1, limit = 6, signal } = {}) {
	const safePage = Math.max(1, Math.trunc(Number(page) || 1));
	const safeLimit = Math.max(1, Math.min(20, Math.trunc(Number(limit) || 6)));
	const params = new URLSearchParams({
		page: String(safePage),
		limit: String(safeLimit),
	});
	return getJson(
		`/hotel-reviews/hotel/${encodeURIComponent(slug)}?${params.toString()}`,
		{ cache: "no-store", signal }
	);
}

export const submitHotelReview = (slug, payload = {}, token = "") =>
	postJson(`/hotel-reviews/hotel/${encodeURIComponent(slug)}`, payload, {
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});

export const resolveHotelReviewInvitation = (reviewToken) =>
	postJson("/hotel-reviews/invitations/resolve", { reviewToken });

export async function getRoomSearchResults(query) {
	const data = await fetchJson(`/room-query-list/${encodeURIComponent(query)}`, {
		revalidate: 30,
	});
	return Array.isArray(data) ? data : [];
}

export async function getDealHotels({ includeAllConfigured = false } = {}) {
	const path = includeAllConfigured
		? "/hotels/active-with-deals?mode=all"
		: "/hotels/active-with-deals";
	const data = await fetchJson(path, {
		revalidate: 60,
	});
	return Array.isArray(data) ? data : [];
}

export const signupJannatClient = (payload) => postJson("/signup", payload);

export const signinJannatClient = (payload) => postJson("/signin", payload);

export const googleLoginJannatClient = (idToken) =>
	postJson("/google-login", { idToken });

export const propertyListingJannatClient = (payload) =>
	postJson("/property-listing", payload);

export const forgotPasswordJannatClient = (payload) =>
	putJson("/forgot-password", { ...payload, client: "jannat" });

export const resetPasswordJannatClient = (payload) =>
	putJson("/reset-password", payload);

export const verifyReservationToken = (token) =>
	postJson("/paypal/reservation-verification", { token });

export async function getSingleReservationInvoice(confirmation) {
	return fetchJson(`/single-reservations/${encodeURIComponent(confirmation)}`, {
		cache: "no-store",
	});
}

export async function getReservationById(reservationId) {
	return fetchJson(
		`/reservations/paypal/link-payment/${encodeURIComponent(reservationId)}`,
		{ cache: "no-store", timeoutMs: 3500 }
	);
}

export const payReservationViaPayPalLink = (payload) =>
	postJson("/reservations/paypal/link-pay", payload);

export const recoverReservationPaymentAccountSession = (payload) =>
	postJson("/reservations/paypal/link-payment/session", payload);

export const getUserAndReservationData = (userId) =>
	getJson(`/user/reservations/${encodeURIComponent(userId)}`);

export const closePublicSupportCase = (caseId, payload = {}) =>
	putJson(`/support-cases/client/${encodeURIComponent(caseId)}`, {
		...payload,
		caseStatus: "closed",
	});

export const getPayPalClientToken = () => getJson("/paypal/token-generated");

export const createPayPalOrder = (payload) => postJson("/paypal/order/create", payload);

export const preparePayPalPendingReservation = (payload) =>
	postJson("/reservations/paypal/pending", payload);

export const cancelPayPalPendingReservation = (payload) =>
	postJson("/reservations/paypal/pending-cancel", payload);

export const createReservationViaPayPal = (payload) =>
	postJson("/reservations/paypal/create", payload);

export const createUncompleteReservationDocument = (payload) =>
	postJson("/create-uncomplete-reservation-document", payload);

export const currencyConversion = async (amounts = []) => {
	const saudimoney = amounts
		.map((amount) => {
			const normalized = Number(amount);
			return Number.isFinite(normalized) ? normalized.toFixed(2) : "0.00";
		})
		.join(",");
	return getJson(`/currencyapi-amounts/${saudimoney}`);
};
