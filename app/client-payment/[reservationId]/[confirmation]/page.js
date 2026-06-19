import UtilityShell from "../../../../components/UtilityShell";
import { BRAND_NAME } from "../../../../lib/constants";

export const metadata = {
	title: `Client Payment | ${BRAND_NAME}`,
	description: "Private client payment link for Jannat Booking guests.",
	robots: { index: false, follow: false },
};

export default async function ClientPaymentPage({ params }) {
	const { confirmation } = await params;
	return (
		<UtilityShell
			eyebrow="Secure payment"
			title="Private payment link"
			copy={`This guest payment route is intentionally not indexed. If you were sent this link, Jannat Booking support can help complete payment securely. Confirmation reference: ${confirmation || "pending"}.`}
			primaryHref="/contact"
			primaryLabel="Contact support"
		/>
	);
}
