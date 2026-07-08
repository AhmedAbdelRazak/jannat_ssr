"use client";

import Link from "next/link";
import { Alert, Spin } from "antd";
import { CalendarDays, FileText, Hotel, LogIn, ReceiptText, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getUserAndReservationData } from "../lib/api";
import { safeNumber } from "../lib/booking";
import { useJannatApp } from "./JannatAppProvider";

const copy = {
	en: {
		eyebrow: "Account",
		title: "Guest dashboard",
		copy: "Review your Jannat Booking reservations and invoices in one place.",
		signinTitle: "Sign in to view your dashboard",
		signinCopy: "After a successful payment, the account is opened automatically on this device.",
		signin: "Sign in",
		noReservations: "No reservations are linked to this account yet.",
		confirmation: "Confirmation",
		dates: "Dates",
		total: "Total",
		paid: "Paid",
		viewInvoice: "View invoice",
	},
	ar: {
		eyebrow: "الحساب",
		title: "لوحة تحكم الضيف",
		copy: "راجع حجوزاتك وفواتيرك مع جنات بوكينج في مكان واحد.",
		signinTitle: "سجل الدخول لعرض لوحة التحكم",
		signinCopy: "بعد نجاح الدفع، يتم فتح الحساب تلقائياً على هذا الجهاز.",
		signin: "تسجيل الدخول",
		noReservations: "لا توجد حجوزات مرتبطة بهذا الحساب حتى الآن.",
		confirmation: "رقم التأكيد",
		dates: "التواريخ",
		total: "الإجمالي",
		paid: "المدفوع",
		viewInvoice: "عرض الفاتورة",
	},
};

const formatDate = (value, language) => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return new Intl.DateTimeFormat(language === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
		timeZone: "UTC",
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
};

const money = (value) =>
	`SAR ${safeNumber(value, 0).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;

export default function DashboardClient() {
	const { auth, isSignedIn, isArabic, language, hrefWithLanguage } = useJannatApp();
	const labels = copy[isArabic ? "ar" : "en"];
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [reservations, setReservations] = useState([]);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			if (!auth?.user?._id) return;
			setLoading(true);
			setError("");
			try {
				const data = await getUserAndReservationData(auth.user._id);
				if (!cancelled) setReservations(Array.isArray(data?.reservations) ? data.reservations : []);
			} catch (loadError) {
				if (!cancelled) setError(loadError?.message || "Dashboard could not be loaded.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [auth?.user?._id]);

	if (!isSignedIn) {
		return (
			<section className="section dashboard-page">
				<div className="container dashboard-empty premium-card">
					<LogIn size={40} />
					<p className="eyebrow">{labels.eyebrow}</p>
					<h1>{labels.signinTitle}</h1>
					<p>{labels.signinCopy}</p>
					<Link className="btn btn-primary" href={hrefWithLanguage("/signin")}>
						{labels.signin}
					</Link>
				</div>
			</section>
		);
	}

	return (
		<section className="section dashboard-page" dir={isArabic ? "rtl" : "ltr"}>
			<div className="container dashboard-shell">
				<div className="dashboard-hero premium-card">
					<UserRound size={36} />
					<div>
						<p className="eyebrow">{labels.eyebrow}</p>
						<h1>{labels.title}</h1>
						<p>{labels.copy}</p>
					</div>
				</div>
				{loading ? (
					<div className="dashboard-loader premium-card">
						<Spin />
					</div>
				) : error ? (
					<Alert type="error" showIcon message={error} />
				) : reservations.length ? (
					<div className="dashboard-reservations">
						{reservations.map((reservation) => {
							const confirmation = reservation.confirmation_number || "";
							const hotelName = reservation.hotelName || reservation.hotelId?.hotelName || "Jannat Booking";
							return (
								<article className="dashboard-reservation-card premium-card" key={reservation._id || confirmation}>
									<div className="dashboard-reservation-main">
										<span className="dashboard-reservation-icon">
											<Hotel size={20} />
										</span>
										<div>
											<h2>{hotelName}</h2>
											<span className="dashboard-confirmation">
												<ReceiptText size={15} />
												{labels.confirmation}: <bdi dir="ltr">{confirmation}</bdi>
											</span>
											<span className="dashboard-dates">
												<CalendarDays size={15} />
												{labels.dates}:{" "}
												<bdi dir="ltr">
													{formatDate(reservation.checkin_date, language)} - {formatDate(reservation.checkout_date, language)}
												</bdi>
											</span>
										</div>
									</div>
									<div className="dashboard-reservation-money">
										<span>
											<strong>{labels.total}</strong>
											<em dir="ltr">{money(reservation.total_amount)}</em>
										</span>
										<span>
											<strong>{labels.paid}</strong>
											<em dir="ltr">{money(reservation.paid_amount)}</em>
										</span>
									</div>
									<Link className="btn btn-primary" href={hrefWithLanguage(`/single-reservation/${confirmation}`)}>
										<FileText size={17} />
										{labels.viewInvoice}
									</Link>
								</article>
							);
						})}
					</div>
				) : (
					<div className="dashboard-empty premium-card">
						<ReceiptText size={38} />
						<p>{labels.noReservations}</p>
					</div>
				)}
			</div>
		</section>
	);
}
