import Link from "next/link";
import { Download, FileText, Headphones } from "lucide-react";
import { getSingleReservationInvoice } from "../../../lib/api";
import { BRAND_NAME } from "../../../lib/constants";
import {
	buildReceiptRoomRows,
	calculateReceiptNights,
	code39Bars,
	countryCodeFromNationality,
	deriveReceiptPayment,
	displayNationality,
	formatReceiptDate,
	receiptStatus,
} from "../../../lib/officialReceipt";

export const metadata = {
	title: `Reservation Details | ${BRAND_NAME}`,
	description: "Private reservation details for Jannat Booking guests.",
	robots: { index: false, follow: false },
};

const money = (value) =>
	new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Number(value || 0));

const titleCase = (value) =>
	String(value || "").trim().replace(/\b\w/g, (character) => character.toUpperCase());

function BilingualLabel({ en, ar }) {
	return (
		<span className="bilingual-label">
			<strong>{en}</strong>
			<span dir="rtl" lang="ar">{ar}</span>
		</span>
	);
}

function Barcode({ value }) {
	const barcode = code39Bars(value);
	return (
		<svg
			className="receipt-barcode"
			viewBox={`0 0 ${barcode.width} 44`}
			role="img"
			aria-label={`Barcode for ${barcode.normalized}`}
			preserveAspectRatio="none"
		>
			<rect width={barcode.width} height="44" fill="#fff" />
			{barcode.bars.map((bar, index) => (
				<rect key={`${bar.x}-${index}`} x={bar.x} y="2" width={bar.width} height="40" fill="#111" />
			))}
		</svg>
	);
}

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
					<p>We could not load this reservation. Please check the confirmation number or contact Jannat Booking support.</p>
					<div className="hero-actions">
						<Link className="btn btn-primary" href="/contact">Contact support</Link>
						<Link className="btn btn-ghost" href="/our-hotels">Browse hotels</Link>
					</div>
				</div>
			</section>
		);
	}

	const customer = reservation.customer_details || reservation.customerDetails || {};
	const nights = calculateReceiptNights(reservation.checkin_date, reservation.checkout_date);
	const rooms = buildReceiptRoomRows(reservation, hotel, nights);
	const payment = deriveReceiptPayment(reservation);
	const status = receiptStatus(reservation.reservation_status || reservation.state);
	const bookingNo = String(reservation.confirmation_number || confirmation || "N/A");
	const supplierBookingNo = String(
		reservation.supplierData?.suppliedBookingNo ||
			reservation.supplierData?.supplierBookingNo ||
			reservation.supplierData?.supplierBookingNumber ||
			bookingNo,
	);
	const supplierName =
		reservation.supplierData?.supplierName ||
		reservation.supplierData?.suppliedBy ||
		hotel?.suppliedBy ||
		"N/A";
	const hotelName = titleCase(hotel?.hotelName || reservation.hotelName || "Hotel reservation");
	const hotelNameArabic = hotel?.hotelName_OtherLanguage || reservation.hotelName_OtherLanguage || "";
	const countryCode = countryCodeFromNationality(customer.nationality);
	const nationality = displayNationality(customer.nationality, countryCode);
	const totalRooms = rooms.reduce((sum, room) => sum + room.count, 0);
	const guests = Number(reservation.total_guests || 0) || totalRooms || 1;
	const bookingSource = reservation.booking_source || "Jannatbooking.com";

	return (
		<section className="section official-receipt-page">
			<div className="container receipt-page-actions no-print">
				<div>
					<p className="eyebrow">Official booking receipt</p>
					<h1>Your reservation details</h1>
				</div>
				<div className="invoice-actions">
					<a className="btn btn-primary" href={`/api/single-reservations/${encodeURIComponent(confirmation)}/pdf`}>
						<Download size={18} /> Download PDF
					</a>
					<Link className="btn btn-ghost" href="/contact"><Headphones size={18} /> Support</Link>
				</div>
			</div>

			<article className="official-receipt container" dir="ltr">
				<header className="receipt-hero">
					<div className="brand-lockup" aria-label="Jannat Booking">
						<div className="brand-name">JANNAT</div>
						<div className="brand-site">Booking.com</div>
					</div>
					<div className="receipt-title">
						<strong>Booking Receipt</strong>
						<span dir="rtl" lang="ar">فاتورة الحجز</span>
					</div>
				</header>
				<div className="receipt-accent" />
				<section className="hotel-banner">
					<div>{hotelName}</div>
					{hotelNameArabic ? <div dir="rtl" lang="ar">{hotelNameArabic}</div> : null}
				</section>
				<section className="booking-band">
					<div><strong>Booking No:</strong> <bdi dir="ltr">{bookingNo}{supplierBookingNo !== bookingNo ? ` / ${supplierBookingNo}` : ""}</bdi></div>
					<div><strong>Booking Date:</strong> {formatReceiptDate(reservation.createdAt || reservation.booked_at)}</div>
				</section>

				<main className="receipt-body">
					<div className="identity-layout">
						<div className="identity-main">
							<div className="supplier-lines">
								<div><strong>Supplied By:</strong> {supplierName}</div>
								<div><strong>Supplier Booking No:</strong> <bdi dir="ltr">{supplierBookingNo}</bdi></div>
							</div>
							<div className="section-heading">
								<strong>Reservation Details</strong>
								<span dir="rtl" lang="ar">تفاصيل الحجز</span>
							</div>
							<div className="guest-card">
								<BilingualLabel en="Guest Name" ar="اسم الضيف" />
								<span className="detail-colon">:</span>
								<span className="guest-name">{customer.name || "Guest"}</span>
							</div>
						</div>
						<aside className="confirmation-panel">
							<div className="confirmation-title" dir="rtl" lang="ar">رقم حجز الفندق</div>
							<div className="confirmation-box">
								<strong>Hotel Confirmation No.</strong>
								<span className="confirmation-number">{bookingNo}</span>
								<Barcode value={bookingNo} />
							</div>
							<div className="nationality-card">
								<BilingualLabel en="Nationality" ar="الجنسية" />
								<span className="detail-colon">:</span>
								<span>{nationality}</span>
								{countryCode ? <span className={`fi fi-${countryCode.toLowerCase()} nationality-flag`} role="img" aria-label={`${nationality} flag`} /> : null}
							</div>
						</aside>
					</div>

					<table className="stay-table">
						<thead><tr>
							<th><BilingualLabel en="Check-in Date" ar="تاريخ الوصول" /></th>
							<td><strong>{formatReceiptDate(reservation.checkin_date)}</strong><span dir="rtl" lang="ar">{formatReceiptDate(reservation.checkin_date, "ar-EG")}</span></td>
							<th><BilingualLabel en="Guests" ar="عدد الضيوف" /></th>
							<th><BilingualLabel en="Nights" ar="الليالي" /></th>
							<th><BilingualLabel en="Booking Status" ar="حالة الحجز" /></th>
						</tr></thead>
						<tbody><tr>
							<th><BilingualLabel en="Checkout Date" ar="تاريخ المغادرة" /></th>
							<td><strong>{formatReceiptDate(reservation.checkout_date)}</strong><span dir="rtl" lang="ar">{formatReceiptDate(reservation.checkout_date, "ar-EG")}</span></td>
							<td className="large-value">{guests}</td>
							<td className="large-value">{nights}</td>
							<td className={status.positive ? "status-positive" : "status-neutral"}><strong dir="rtl" lang="ar">{status.ar}</strong><span>{titleCase(status.en)}</span></td>
						</tr></tbody>
					</table>

					<div className="finance-layout">
						<section className="rooms-section">
							<table className="rooms-table">
								<thead><tr>
									<th><BilingualLabel en="No. of rooms" ar="عدد الغرف" /></th>
									<th><BilingualLabel en="Room Type" ar="نوع الغرفة" /></th>
									<th><BilingualLabel en="Night price" ar="سعر الليلة" /></th>
									<th><BilingualLabel en="Total price" ar="إجمالي السعر" /></th>
								</tr></thead>
								<tbody>
									{rooms.length ? rooms.map((room, index) => (
										<tr key={`${room.englishName}-${room.rate}-${index}`}>
											<td className="large-value">{room.count}</td>
											<td><strong>{room.englishName}</strong>{room.arabicName ? <span dir="rtl" lang="ar">{room.arabicName}</span> : null}</td>
											<td>{room.rate > 0 ? `${money(room.rate)} SAR` : "N/A"}</td>
											<td>{room.total > 0 ? `${money(room.total)} SAR` : "N/A"}</td>
										</tr>
									)) : <tr><td colSpan={4}>Room details are available from Jannat Booking support.</td></tr>}
								</tbody>
							</table>
							<div className="booking-source"><strong>Booking Source:</strong> {bookingSource}</div>
							<div className={`payment-method payment-${payment.method.tone}`}>
								<div><BilingualLabel en="Payment Method" ar="طريقة الدفع" /></div>
								<div><strong>{payment.method.en}</strong><span dir="rtl" lang="ar">{payment.method.ar}</span></div>
							</div>
						</section>
						<aside className="payment-details">
							<div className="payment-heading"><strong>Payment Details</strong><span dir="rtl" lang="ar">تفاصيل الدفع</span></div>
							<div className="payment-row payment-total"><BilingualLabel en="Total Amount" ar="السعر الإجمالي" /><span>:</span><strong>{money(payment.total)} SAR</strong></div>
							<div className="payment-row payment-deposit"><BilingualLabel en="Deposit" ar="عربون" /><span>:</span><strong>{money(payment.paid)} SAR</strong></div>
							<div className="payment-row payment-remaining"><BilingualLabel en="Remaining Due" ar="المبلغ المتبقي" /><span>:</span><strong>{money(payment.remaining)} SAR</strong></div>
						</aside>
					</div>
				</main>
				<footer className="receipt-footer">
					<div>Many Thanks For Staying With Us At <strong>{hotelName}</strong></div>
					<div>For Better Rates Next Time, Please Check Jannatbooking.com</div>
				</footer>
			</article>
		</section>
	);
}
