import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { BRAND_NAME } from "../../lib/constants";
import { addLanguageToHref, normalizeLanguage } from "../../lib/language";

export const metadata = {
	title: "Reservation Confirmed",
	description: `Reservation confirmation page for ${BRAND_NAME}.`,
	robots: { index: false, follow: false },
};

export default async function ReservationConfirmedPage({ searchParams }) {
	const params = await searchParams;
	const name = params?.name || "Guest";
	const confirmation = params?.confirmation_number || "";
	const total = params?.total_price || "";
	const rooms = params?.total_rooms || "";
	const language = normalizeLanguage(params?.lang) || "en";

	return (
		<section className="section confirmation-page">
			<div className="container confirmation-card premium-card">
				<CheckCircle2 size={44} />
				<p className="eyebrow">Jannat Booking</p>
				<h1>Reservation received</h1>
				<p>
					Thank you {name}. Your booking request has been received and the hotel team will review the reservation details.
				</p>
				<div className="confirmation-details">
					{confirmation ? (
						<span>
							<strong>Confirmation</strong>
							<bdi dir="ltr" className="ltr-value">{confirmation}</bdi>
						</span>
					) : null}
					{rooms ? (
						<span>
							<strong>Rooms</strong>
							<bdi dir="ltr" className="ltr-value">{rooms}</bdi>
						</span>
					) : null}
					{total ? (
						<span>
							<strong>Total</strong>
							<bdi dir="ltr" className="ltr-value">SAR {total}</bdi>
						</span>
					) : null}
				</div>
				<div className="hero-actions">
					<Link className="btn btn-primary" href={addLanguageToHref("/our-hotels", language)}>
						Browse hotels
					</Link>
					<Link className="btn btn-ghost" href={addLanguageToHref("/rooms", language)}>
						Search rooms
					</Link>
				</div>
			</div>
		</section>
	);
}
