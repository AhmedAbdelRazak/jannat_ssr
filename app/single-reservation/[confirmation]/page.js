import Link from "next/link";
import { FileText } from "lucide-react";
import { apiUrl, getSingleReservationInvoice } from "../../../lib/api";
import { BRAND_NAME } from "../../../lib/constants";

export const metadata = {
	title: `Reservation Details | ${BRAND_NAME}`,
	description: "Private reservation details for Jannat Booking guests.",
	robots: { index: false, follow: false },
};

const money = (value) => {
	const number = Number(value || 0);
	return Number.isFinite(number) ? number.toFixed(2) : "0.00";
};

const formatDate = (value) => {
	if (!value) return "N/A";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "N/A";
	return new Intl.DateTimeFormat("en-US", {
		timeZone: "UTC",
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
};

const nightsBetween = (checkin, checkout) => {
	const start = new Date(checkin);
	const end = new Date(checkout);
	const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
	const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
	const nights = Math.round((endDay - startDay) / 86400000);
	return Number.isFinite(nights) && nights > 0 ? nights : 1;
};

export default async function SingleReservationPage({ params }) {
	const { confirmation } = await params;
	const data = await getSingleReservationInvoice(confirmation);
	const reservation = data?.reservation;
	const hotel = data?.hotel;

	if (!reservation) {
		return (
			<section className="section confirmation-page">
				<div className="container confirmation-card premium-card">
					<FileText size={42} />
					<p className="eyebrow">Reservation details</p>
					<h1>Reservation not found</h1>
					<p>
						We could not load this reservation. Please check the confirmation
						number or contact Jannat Booking support.
					</p>
					<div className="hero-actions">
						<Link className="btn btn-primary" href="/contact">
							Contact support
						</Link>
						<Link className="btn btn-ghost" href="/our-hotels">
							Browse hotels
						</Link>
					</div>
				</div>
			</section>
		);
	}

	const customer = reservation.customer_details || reservation.customerDetails || {};
	const rooms = Array.isArray(reservation.pickedRoomsType)
		? reservation.pickedRoomsType
		: [];
	const nights = nightsBetween(reservation.checkin_date, reservation.checkout_date);
	const totalAmount = Number(reservation.total_amount || 0);
	const paidAmount =
		Number(reservation.paid_amount || 0) +
		Number(reservation.payment_details?.onsite_paid_amount || 0);
	const remaining = Math.max(0, totalAmount - paidAmount);

	return (
		<section className="section invoice-page">
			<div className="container invoice-card premium-card">
				<div className="invoice-head">
					<div>
						<p className="eyebrow">Booking receipt</p>
						<h1>{BRAND_NAME}</h1>
						<p>{hotel?.hotelName || reservation.hotelName || "Hotel reservation"}</p>
					</div>
					<div className="invoice-actions">
						<a
							className="btn btn-primary"
							href={apiUrl(`/single-reservations/${encodeURIComponent(confirmation)}/pdf`)}
						>
							Download PDF
						</a>
						<Link className="btn btn-ghost" href="/contact">
							Support
						</Link>
					</div>
				</div>
				<div className="invoice-details">
					<span>
						<strong>Booking no.</strong>
						<bdi dir="ltr">{reservation.confirmation_number || confirmation}</bdi>
					</span>
					<span>
						<strong>Guest</strong>
						{customer.name || "Guest"}
					</span>
					<span>
						<strong>Check in</strong>
						{formatDate(reservation.checkin_date)}
					</span>
					<span>
						<strong>Check out</strong>
						{formatDate(reservation.checkout_date)}
					</span>
					<span>
						<strong>Nights</strong>
						{nights}
					</span>
					<span>
						<strong>Status</strong>
						{reservation.reservation_status || "Confirmed"}
					</span>
				</div>
				<div className="invoice-table-wrap">
					<table className="invoice-table">
						<thead>
							<tr>
								<th>Room</th>
								<th>Qty</th>
								<th>Nights</th>
								<th>Rate</th>
								<th>Total</th>
							</tr>
						</thead>
						<tbody>
							{rooms.length ? (
								rooms.map((room, index) => {
									const count = Number(room.count || 1);
									const firstDay = room.pricingByDay?.[0] || {};
									const rate = Number(room.chosenPrice || firstDay.rootPrice || 0);
									return (
										<tr key={`${room.displayName || room.room_type}-${index}`}>
											<td>{room.displayName || room.room_type || "Room"}</td>
											<td>{count}</td>
											<td>{nights}</td>
											<td>SAR {money(rate)}</td>
											<td>SAR {money(rate * count * nights)}</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td colSpan={5}>Room details are available from Jannat Booking support.</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				<div className="invoice-summary">
					<span>
						<strong>Total</strong>
						SAR {money(totalAmount)}
					</span>
					<span>
						<strong>Paid</strong>
						SAR {money(paidAmount)}
					</span>
					<span>
						<strong>Remaining</strong>
						SAR {money(remaining)}
					</span>
				</div>
				<p className="invoice-note">
					This public-safe receipt does not expose card data or account
					credentials. For changes or questions, contact Jannat Booking support.
				</p>
			</div>
		</section>
	);
}
