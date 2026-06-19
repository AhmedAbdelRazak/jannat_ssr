import UtilityShell from "../../../../components/UtilityShell";
import { BRAND_NAME } from "../../../../lib/constants";

export const metadata = {
	title: `Private Checkout Link | ${BRAND_NAME}`,
	description: "Private generated checkout link for Jannat Booking guests.",
	robots: { index: false, follow: false },
};

export default async function GeneratedLinkCheckoutPage({ params }) {
	const { confirmation } = await params;
	return (
		<UtilityShell
			eyebrow="Private checkout"
			title="Reservation checkout link"
			copy={`This private checkout link is protected from search indexing. Confirmation reference: ${confirmation || "pending"}.`}
			primaryHref="/contact"
			primaryLabel="Contact support"
		/>
	);
}
