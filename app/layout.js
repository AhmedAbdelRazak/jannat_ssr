import "./globals.css";
import "antd/dist/reset.css";
import { Suspense } from "react";
import { headers } from "next/headers";
import { getDealHotels, getHotels, getWebsite } from "../lib/api";
import {
	BRAND_NAME,
	BRAND_URL,
	DEFAULT_HERO_IMAGE,
	FOUNDING_YEAR,
	PAYMENT_METHODS,
	CONTACT_EMAIL,
} from "../lib/constants";
import { LANGUAGES } from "../lib/i18n";
import { normalizeLanguage } from "../lib/language";
import { hotelsHaveDeals } from "../lib/deals";
import Header from "../components/Header";
import Footer from "../components/Footer";
import LazySupportWidget from "../components/LazySupportWidget";
import { maskWebsiteEmails } from "../lib/email";
import { JannatAppProvider } from "../components/JannatAppProvider";
import Analytics from "../components/Analytics";
import {
	getJannatSupportConfig,
	isVirtualJannatSupportHotelId,
} from "../lib/supportConfig";
import { SENSITIVE_REVIEW_QUERY_KEYS } from "../lib/urlPrivacy";

const ICON_VERSION = "jb-20260619-premium";
const PRIVATE_REVIEW_LINK_GUARD = `
	(function () {
		try {
			var sensitiveKeys = new Set(${JSON.stringify([...SENSITIVE_REVIEW_QUERY_KEYS])});
			var url = new URL(window.location.href);
			if (String(url.pathname || "").toLowerCase().indexOf("/single-hotel/") !== 0) return;
			var reviewLink = {};
			var changed = false;
			Array.from(url.searchParams.keys()).forEach(function (key) {
				var normalized = String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
				if (!sensitiveKeys.has(normalized)) return;
				var value = url.searchParams.get(key) || "";
				if (normalized === "reviewtoken" && !reviewLink.reviewToken) reviewLink.reviewToken = value;
				if (
					(normalized === "confirmationnumber" || normalized === "confirmationumber" || normalized === "confirmation") &&
					!reviewLink.confirmationNumber
				) reviewLink.confirmationNumber = value;
				url.searchParams.delete(key);
				changed = true;
			});
			var rawHash = String(url.hash || "").replace(/^#/, "");
			var hashQuestionIndex = rawHash.indexOf("?");
			var hashHasBareParams = hashQuestionIndex < 0 && rawHash.indexOf("=") >= 0;
			if (hashQuestionIndex >= 0 || hashHasBareParams) {
				var hashAnchor = hashQuestionIndex >= 0 ? rawHash.slice(0, hashQuestionIndex) : "";
				var hashQuery = hashQuestionIndex >= 0 ? rawHash.slice(hashQuestionIndex + 1) : rawHash;
				var hashParams = new URLSearchParams(hashQuery);
				Array.from(hashParams.keys()).forEach(function (key) {
					var normalized = String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
					if (!sensitiveKeys.has(normalized)) return;
					var value = hashParams.get(key) || "";
					if (normalized === "reviewtoken" && !reviewLink.reviewToken) reviewLink.reviewToken = value;
					if (
						(normalized === "confirmationnumber" || normalized === "confirmationumber" || normalized === "confirmation") &&
						!reviewLink.confirmationNumber
					) reviewLink.confirmationNumber = value;
					hashParams.delete(key);
					changed = true;
				});
				var remainingHashQuery = hashParams.toString();
				url.hash = hashAnchor
					? "#" + hashAnchor + (remainingHashQuery ? "?" + remainingHashQuery : "")
					: (remainingHashQuery ? "#" + remainingHashQuery : "");
			}
			if (reviewLink.reviewToken || reviewLink.confirmationNumber) {
				Object.defineProperty(window, "__JANNAT_PRIVATE_REVIEW_LINK__", {
					value: reviewLink,
					configurable: true,
				});
			}
			if (changed) {
				window.history.replaceState(
					window.history.state,
					"",
					url.pathname + url.search + url.hash
				);
			}
		} catch (_error) {}
	})();
`;

export const metadata = {
	metadataBase: new URL(BRAND_URL),
	title: {
		default: `${BRAND_NAME} | Makkah and Madinah Hotel Reservations`,
		template: `%s | ${BRAND_NAME}`,
	},
	description:
		"Book affordable, trusted Makkah and Madinah hotels with Jannat Booking, operating since 2019 with direct hotel-reception coordination, PayPal, and major card payment support.",
	alternates: {
		canonical: "/",
		languages: {
			en: "/?lang=en",
			ar: "/?lang=ar",
		},
	},
	openGraph: {
		type: "website",
		siteName: BRAND_NAME,
		images: [DEFAULT_HERO_IMAGE],
	},
	icons: {
		icon: [
			{ url: `/favicon.svg?v=${ICON_VERSION}`, type: "image/svg+xml" },
			{ url: `/favicon.ico?v=${ICON_VERSION}`, sizes: "any" },
			{ url: `/icons/icon-16.png?v=${ICON_VERSION}`, type: "image/png", sizes: "16x16" },
			{ url: `/icons/icon-32.png?v=${ICON_VERSION}`, type: "image/png", sizes: "32x32" },
			{ url: `/icons/icon-48.png?v=${ICON_VERSION}`, type: "image/png", sizes: "48x48" },
			{ url: `/icons/icon-192.png?v=${ICON_VERSION}`, type: "image/png", sizes: "192x192" },
			{ url: `/icons/icon-512.png?v=${ICON_VERSION}`, type: "image/png", sizes: "512x512" },
		],
		apple: [{ url: `/icons/apple-touch-icon.png?v=${ICON_VERSION}`, sizes: "180x180" }],
	},
	manifest: "/site.webmanifest",
	twitter: {
		card: "summary_large_image",
		images: [DEFAULT_HERO_IMAGE],
	},
};

export default async function RootLayout({ children }) {
	const requestHeaders = await headers();
	const initialLanguage = normalizeLanguage(requestHeaders.get("x-jannat-language")) || "en";
	const initialDirection = LANGUAGES[initialLanguage]?.dir || "ltr";
	const [website, hotels, dealHotels] = await Promise.all([getWebsite(), getHotels(), getDealHotels()]);
	const clientWebsite = maskWebsiteEmails({
		janatLogo: { url: website?.janatLogo?.url || "" },
		phone: website?.phone,
		whatsappNumber: website?.whatsappNumber,
	});
	const supportConfig = getJannatSupportConfig();
	const hasOffers = hotelsHaveDeals(dealHotels);
	const footerHotels = Array.isArray(hotels)
		? hotels.slice(0, 4).map((hotel) => ({
				_id: hotel._id,
				hotelName: hotel.hotelName,
				hotelName_OtherLanguage: hotel.hotelName_OtherLanguage,
		  }))
		: [];
	const supportHotels = Array.isArray(hotels)
		? hotels.filter((hotel) => !isVirtualJannatSupportHotelId(hotel._id, supportConfig)).map((hotel) => ({
				_id: hotel._id,
				hotelName: hotel.hotelName,
				belongsTo: hotel.belongsTo?._id || hotel.belongsTo || "",
		  }))
		: [];

	const jsonLd = [
		{
			"@context": "https://schema.org",
			"@type": "Organization",
			name: BRAND_NAME,
			url: BRAND_URL,
			logo: website?.janatLogo?.url,
			description:
				"Jannat Booking helps pilgrims and travelers book affordable Makkah and Madinah hotels with direct hotel-reception coordination, secure payment-support flows, and transparent reservation activity displayed from the system.",
			areaServed: ["Makkah", "Madinah", "Saudi Arabia"],
			foundingDate: FOUNDING_YEAR,
			paymentAccepted: PAYMENT_METHODS.join(", "),
			knowsAbout: [
				"Umrah hotel reservations",
				"Haj hotel reservations",
				"Makkah hotels",
				"Madinah hotels",
				"PayPal hotel payments",
				"card hotel payments",
				"direct hotel reception coordination",
			],
		},
		{
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: BRAND_NAME,
			url: BRAND_URL,
			potentialAction: {
				"@type": "SearchAction",
				target: `${BRAND_URL}/rooms?destination={search_term_string}`,
				"query-input": "required name=search_term_string",
			},
		},
		{
			"@context": "https://schema.org",
			"@type": "TravelAgency",
			name: BRAND_NAME,
			url: BRAND_URL,
			image: DEFAULT_HERO_IMAGE,
			telephone: website?.phone,
			email: CONTACT_EMAIL,
			areaServed: ["Makkah", "Madinah", "Saudi Arabia"],
			foundingDate: FOUNDING_YEAR,
			priceRange: "$$",
			paymentAccepted: PAYMENT_METHODS.join(", "),
			description:
				"Trusted hotel reservation platform for Haj, Umrah, and Saudi city stays, with PayPal and major card payment support and direct hotel-reception coordination.",
		},
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: [
				{
					"@type": "Question",
					name: "Does Jannat Booking support secure online payments?",
					acceptedAnswer: {
						"@type": "Answer",
						text: "Jannat Booking supports PayPal and major card payment options such as Visa and Mastercard. Private payment and reservation routes are not indexed by search engines.",
					},
				},
				{
					"@type": "Question",
					name: "How does Jannat Booking coordinate hotel reservations?",
					acceptedAnswer: {
						"@type": "Answer",
						text: "Jannat Booking helps guests compare hotel options and coordinates reservation requests directly with hotel reception teams rather than unnecessary middlemen.",
					},
				},
			],
		},
	];

	return (
		<html lang={initialLanguage} dir={initialDirection} data-scroll-behavior="smooth" suppressHydrationWarning>
			<body>
				<script dangerouslySetInnerHTML={{ __html: PRIVATE_REVIEW_LINK_GUARD }} />
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
				<JannatAppProvider initialLanguage={initialLanguage}>
					<Suspense fallback={null}>
						<Analytics />
					</Suspense>
					<Header website={clientWebsite} hasOffers={hasOffers} />
					<main>{children}</main>
					<Footer website={clientWebsite} hotels={footerHotels} hasOffers={hasOffers} />
					<LazySupportWidget
						hotels={supportHotels}
						supportConfig={supportConfig}
					/>
				</JannatAppProvider>
			</body>
		</html>
	);
}
