import { BRAND_URL } from "../lib/constants";

export default function robots() {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: [
					"/checkout",
					"/dashboard",
					"/signin",
					"/signup",
					"/auth/",
					"/client-payment/",
					"/client-payment-triggering/",
					"/generated-link",
					"/generated-link-checkout/",
					"/single-reservation/",
					"/single-reservations/",
					"/reservation-verification",
					"/reservation-confirmed",
					"/verify/",
				],
			},
		],
		sitemap: `${BRAND_URL}/sitemap.xml`,
		host: BRAND_URL,
	};
}
