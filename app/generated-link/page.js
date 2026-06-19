import UtilityShell from "../../components/UtilityShell";
import { BRAND_NAME } from "../../lib/constants";

export const metadata = {
	title: `Assisted Booking Link | ${BRAND_NAME}`,
	description: "Private assisted booking link for Jannat Booking guests.",
	robots: { index: false, follow: false },
};

export default function GeneratedLinkPage() {
	return (
		<UtilityShell
			eyebrow="Private booking link"
			title="Assisted reservation support"
			copy="This private booking-link flow is protected from search indexing. If support sent you this link and you need help completing it, contact Jannat Booking support."
			primaryHref="/contact"
			primaryLabel="Contact support"
		/>
	);
}
