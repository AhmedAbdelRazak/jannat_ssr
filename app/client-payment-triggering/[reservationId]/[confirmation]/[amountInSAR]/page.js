import UtilityShell from "../../../../../components/UtilityShell";
import { BRAND_NAME } from "../../../../../lib/constants";

export const metadata = {
	title: `Client Payment Trigger | ${BRAND_NAME}`,
	description: "Private Jannat Booking payment trigger route.",
	robots: { index: false, follow: false },
};

export default async function ClientPaymentTriggerPage({ params }) {
	const { confirmation, amountInSAR } = await params;
	return (
		<UtilityShell
			eyebrow="Secure payment"
			title="Private payment request"
			copy={`This protected payment request is not indexed. Confirmation reference: ${confirmation || "pending"}. Amount: SAR ${amountInSAR || "0"}.`}
			primaryHref="/contact"
			primaryLabel="Contact support"
		/>
	);
}
