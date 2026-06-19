import DashboardClient from "../../components/DashboardClient";
import { BRAND_NAME } from "../../lib/constants";

export const metadata = {
	title: `Dashboard | ${BRAND_NAME}`,
	description: "Private Jannat Booking account dashboard.",
	robots: { index: false, follow: false },
};

export default function DashboardPage() {
	return <DashboardClient />;
}
