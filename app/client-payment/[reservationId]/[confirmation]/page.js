import ClientPaymentLinkClient from "../../../../components/ClientPaymentLinkClient";
import { BRAND_NAME } from "../../../../lib/constants";
import { getReservationById } from "../../../../lib/api";
import { sanitizeReservationForPublicPayment } from "../../../../lib/reservationSanitizer";

export const metadata = {
	title: `Client Payment | ${BRAND_NAME}`,
	description: "Private client payment link for Jannat Booking guests.",
	robots: { index: false, follow: false },
};

export default async function ClientPaymentPage({ params }) {
	const { reservationId, confirmation } = await params;
	const reservation = reservationId ? await getReservationById(reservationId) : null;
	return (
		<ClientPaymentLinkClient
			reservation={sanitizeReservationForPublicPayment(reservation)}
			reservationId={reservationId}
			confirmation={confirmation}
		/>
	);
}
