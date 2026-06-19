import ClientPaymentLinkClient from "../../../../../components/ClientPaymentLinkClient";
import { BRAND_NAME } from "../../../../../lib/constants";
import { getReservationById } from "../../../../../lib/api";
import { sanitizeReservationForPublicPayment } from "../../../../../lib/reservationSanitizer";

export const metadata = {
	title: `Client Payment Trigger | ${BRAND_NAME}`,
	description: "Private Jannat Booking payment trigger route.",
	robots: { index: false, follow: false },
};

export default async function ClientPaymentTriggerPage({ params }) {
	const { reservationId, confirmation, amountInSAR } = await params;
	const reservation = reservationId ? await getReservationById(reservationId) : null;
	return (
		<ClientPaymentLinkClient
			reservation={sanitizeReservationForPublicPayment(reservation)}
			reservationId={reservationId}
			confirmation={confirmation}
			requestedAmountSar={amountInSAR}
		/>
	);
}
