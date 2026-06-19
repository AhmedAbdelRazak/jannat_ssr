import ReservationVerificationClient from "../../components/ReservationVerificationClient";
import { BRAND_NAME } from "../../lib/constants";

export const metadata = {
	title: `Reservation Verification | ${BRAND_NAME}`,
	description: "Secure reservation verification for Jannat Booking guests.",
	robots: { index: false, follow: false },
};

export default async function ReservationVerificationPage({ searchParams }) {
	const params = await searchParams;
	return <ReservationVerificationClient token={params?.token || ""} />;
}
