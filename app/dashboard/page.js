import UtilityShell from "../../components/UtilityShell";
import { BRAND_NAME } from "../../lib/constants";

export const metadata = {
	title: `Dashboard | ${BRAND_NAME}`,
	description: "Private Jannat Booking account dashboard.",
	robots: { index: false, follow: false },
};

export default function DashboardPage() {
	return (
		<UtilityShell
			eyebrow="Account"
			title="Guest dashboard"
			copy="Sign in to review your Jannat Booking account and reservation requests."
			primaryHref="/signin"
			primaryLabel="Sign in"
		/>
	);
}
