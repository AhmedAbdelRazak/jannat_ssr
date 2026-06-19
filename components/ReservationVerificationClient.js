"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signinJannatClient, verifyReservationToken } from "../lib/api";
import { trackConversion } from "../lib/analyticsEvents";
import { useJannatApp } from "./JannatAppProvider";

const normalizePhoneInput = (value = "") =>
	String(value || "")
		.replace(/[^\d\s+-]/g, "")
		.trim();

const passwordFromPhone = (phone = "") => normalizePhoneInput(phone).replace(/\s+/g, "");

export default function ReservationVerificationClient({ token }) {
	const router = useRouter();
	const { setAuthSession } = useJannatApp();
	const startedRef = useRef(false);
	const [status, setStatus] = useState("Verifying your reservation...");
	const [error, setError] = useState("");

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;

		if (!token) {
			setError("Invalid or missing verification token.");
			return;
		}

		const run = async () => {
			try {
				const response = await verifyReservationToken(token);
				const reservation = response?.data2 || response?.reservation || response?.data;
				if (!reservation) {
					throw new Error("Reservation verification completed, but no reservation details were returned.");
				}

				trackConversion(
					"reservationRequest",
					{
						transaction_id: reservation?.confirmation_number,
						value: Number(reservation?.total_amount || 0),
						currency: "SAR",
						method: "email_verification",
					},
					["User Confirmed Reservation Without Payment", "Reservation Confirmed Without Payment"]
				);

				const customer = reservation.customerDetails || reservation.customer_details || {};
				const signinPassword = customer.password || passwordFromPhone(customer.phone);
				if (customer.phone && signinPassword) {
					try {
						const session = await signinJannatClient({
							emailOrPhone: customer.phone,
							password: signinPassword,
						});
						setAuthSession(session);
					} catch (signinError) {
						console.warn("Reservation verified, but automatic sign-in failed:", signinError?.message || signinError);
					}
				}
				const query = new URLSearchParams();
				query.set("name", customer.name || "Guest");
				query.set("confirmation_number", reservation.confirmation_number || "");
				query.set("total_price", reservation.total_amount || reservation.total || 0);
				query.set("total_rooms", reservation.total_rooms || 0);
				query.set("hotel_name", reservation.hotelName || "");
				setStatus("Reservation verified. Redirecting to confirmation...");
				window.setTimeout(() => {
					router.replace(`/reservation-confirmed?${query.toString()}`);
				}, 700);
			} catch (err) {
				setError(err.message || "Failed to verify reservation. Please contact support.");
			}
		};

		run();
	}, [router, setAuthSession, token]);

	return (
		<section className="section confirmation-page">
			<div className="container confirmation-card premium-card">
				{error ? null : <Loader2 size={42} className="spin-icon" />}
				<p className="eyebrow">Reservation verification</p>
				<h1>{error ? "Verification needs support" : status}</h1>
				<p>
					{error ||
						"Please keep this page open while Jannat Booking confirms the reservation request."}
				</p>
				{error ? (
					<div className="hero-actions">
						<Link className="btn btn-primary" href="/contact">
							Contact support
						</Link>
						<Link className="btn btn-ghost" href="/our-hotels">
							Browse hotels
						</Link>
					</div>
				) : null}
			</div>
		</section>
	);
}
