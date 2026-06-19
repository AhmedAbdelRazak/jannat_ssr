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
import Header from "../components/Header";
import Footer from "../components/Footer";
import SupportWidget from "../components/SupportWidget";
import { maskWebsiteEmails } from "../lib/email";
import { JannatAppProvider } from "../components/JannatAppProvider";
import Analytics from "../components/Analytics";

const ICON_VERSION = "jb-20260619-premium";

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
	const clientWebsite = maskWebsiteEmails(website);
	const hasOffers = Array.isArray(dealHotels) && dealHotels.length > 0;

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
					<Footer website={clientWebsite} hotels={hotels} hasOffers={hasOffers} />
					<SupportWidget hotels={hotels} website={clientWebsite} />
				</JannatAppProvider>
			</body>
		</html>
	);
}
