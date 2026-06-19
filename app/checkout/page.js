import CheckoutClient from "../../components/CheckoutClient";
import { getWebsite } from "../../lib/api";
import { BRAND_NAME, DEFAULT_HERO_IMAGE } from "../../lib/constants";
import { maskWebsiteEmails } from "../../lib/email";

export const metadata = {
	title: "Checkout",
	description: `Review your ${BRAND_NAME} room cart and complete payment options.`,
	openGraph: { images: [DEFAULT_HERO_IMAGE] },
	robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
	const website = await getWebsite();
	return <CheckoutClient website={maskWebsiteEmails(website)} />;
}
