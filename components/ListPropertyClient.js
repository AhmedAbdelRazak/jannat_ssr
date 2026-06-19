"use client";

import Link from "next/link";
import { useState } from "react";
import {
	Building2,
	CheckCircle2,
	Hash,
	LockKeyhole,
	Mail,
	MapPin,
	Phone,
	UserRound,
} from "lucide-react";
import { propertyListingJannatClient } from "../lib/api";
import { trackConversion } from "../lib/analyticsEvents";
import { ARABIC_BRAND_NAME } from "../lib/constants";
import {
	hotelDestinationOptions,
	normalizeHotelDestination,
} from "../lib/hotelLocations";
import { useJannatApp } from "./JannatAppProvider";

const initialForm = {
	name: "",
	email: "",
	password: "",
	password2: "",
	phone: "",
	hotelName: "",
	hotelAddress: "",
	hotelCountry: "KSA",
	hotelState: "",
	hotelCity: "",
	propertyType: "Hotel",
	hotelFloors: "",
	acceptedTermsAndConditions: false,
};

const propertyTypes = ["Hotel", "Apartments", "Houses"];

const ar = {
	partners: "\u0644\u0644\u0634\u0631\u0643\u0627\u0621",
	title: `اعرض فندقك على ${ARABIC_BRAND_NAME}`,
	copy:
		"\u0623\u0631\u0633\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0641\u0646\u062f\u0642 \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629 \u0648\u0633\u064a\u062a\u0648\u0627\u0635\u0644 \u0641\u0631\u064a\u0642\u0646\u0627 \u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062a\u0648\u0641\u0631 \u0648\u0627\u0644\u0633\u064a\u0627\u0633\u0627\u062a \u0648\u0631\u0628\u0637 \u0627\u0644\u0641\u0646\u062f\u0642 \u0628\u0645\u0646\u0635\u0629 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a.",
	points: [
		"\u0645\u0631\u0627\u062c\u0639\u0629 \u064a\u062f\u0648\u064a\u0629 \u0642\u0628\u0644 \u0627\u0644\u0646\u0634\u0631",
		"\u062f\u0639\u0645 \u0644\u0641\u0646\u0627\u062f\u0642 \u0645\u0643\u0629 \u0648\u0627\u0644\u0645\u062f\u064a\u0646\u0629",
		"\u0631\u0628\u0637 \u0648\u0627\u0636\u062d \u0645\u0639 \u0633\u064a\u0627\u0633\u0627\u062a \u0627\u0644\u0641\u0646\u062f\u0642",
	],
};

export default function ListPropertyClient() {
	const { isArabic, hrefWithLanguage } = useJannatApp();
	const [form, setForm] = useState(initialForm);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	const updateForm = (key, value) =>
		setForm((current) => ({
			...current,
			[key]: value,
		}));

	const updateLocation = (key, value) => {
		const normalized = normalizeHotelDestination(value);
		setForm((current) => ({
			...current,
			hotelState: normalized,
			hotelCity: normalized,
		}));
	};

	const validate = () => {
		const required = [
			"name",
			"email",
			"password",
			"password2",
			"phone",
			"hotelName",
			"hotelAddress",
			"hotelCountry",
			"hotelState",
			"hotelCity",
			"propertyType",
			"hotelFloors",
		];
		const missing = required.find((key) => !String(form[key] || "").trim());
		if (missing) return "Please complete all required fields.";
		if (form.name.trim().split(/\s+/).length < 2) {
			return "Please enter your full name.";
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
			return "Please enter a valid email address.";
		}
		if (form.password.length < 6) return "Password must be at least 6 characters.";
		if (form.hotelCountry !== "KSA") return "Jannat Booking currently accepts KSA properties only.";
		const normalizedState = normalizeHotelDestination(form.hotelState);
		const normalizedCity = normalizeHotelDestination(form.hotelCity);
		if (!normalizedState || !normalizedCity || normalizedState !== normalizedCity) {
			return "Please choose Makkah or Madinah for the property location.";
		}
		if (form.password !== form.password2) return "Passwords do not match.";
		if (!form.acceptedTermsAndConditions) {
			return "Please accept the hotel partner terms.";
		}
		return "";
	};

	const submit = async (event) => {
		event.preventDefault();
		const validationError = validate();
		setError(validationError);
		setMessage("");
		if (validationError) return;

		setBusy(true);
		try {
			const payload = {
				name: form.name.trim(),
				email: form.email.trim().toLowerCase(),
				password: form.password,
				phone: form.phone.trim(),
				hotelName: form.hotelName.trim(),
				hotelAddress: form.hotelAddress.trim(),
				hotelCountry: "KSA",
				hotelState: normalizeHotelDestination(form.hotelState),
				hotelCity: normalizeHotelDestination(form.hotelCity),
				propertyType: form.propertyType,
				hotelFloors: form.hotelFloors.trim(),
				acceptedTermsAndConditions: form.acceptedTermsAndConditions,
			};
			await propertyListingJannatClient(payload);
			trackConversion(
				"lead",
				{
					event_category: "partner_signup",
					event_label: payload.hotelName,
					method: "property_listing_form",
				},
				["Property Listing Submitted", "Lead - Property Listing"]
			);
			setMessage(
				"Your property listing request was received. Jannat Booking will review it and follow up."
			);
			setForm(initialForm);
		} catch (err) {
			setError(err.message || "We could not submit the property listing request.");
		} finally {
			setBusy(false);
		}
	};

	const points = isArabic
		? ar.points
		: [
				"Manual review before publishing",
				"Support for Makkah and Madinah hotels",
				"Clear onboarding around hotel policies",
		  ];
	const locationOptions = hotelDestinationOptions(isArabic);
	const labels = isArabic
		? {
				fullName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644",
				email: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
				phone: "\u0631\u0642\u0645 \u0627\u0644\u062c\u0648\u0627\u0644",
				propertyName: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0646\u062f\u0642",
				propertyAddress: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0641\u0646\u062f\u0642",
				country: "\u0627\u0644\u062f\u0648\u0644\u0629",
				state: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629",
				city: "\u0627\u0644\u0645\u062f\u064a\u0646\u0629",
				propertyType: "\u0646\u0648\u0639 \u0627\u0644\u0645\u0646\u0634\u0623\u0629",
				floors: "\u0639\u062f\u062f \u0627\u0644\u0623\u062f\u0648\u0627\u0631",
				password: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
				confirmPassword: "\u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
				agree: "\u0623\u0648\u0627\u0641\u0642 \u0639\u0644\u0649",
				partnerTerms: "\u0634\u0631\u0648\u0637 \u0634\u0631\u0643\u0627\u0621 \u0627\u0644\u0641\u0646\u0627\u062f\u0642",
				submitting: "\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0631\u0633\u0627\u0644...",
				submit: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0641\u0646\u062f\u0642",
		  }
		: {
				fullName: "Full name",
				email: "Email",
				phone: "Phone",
				propertyName: "Property name",
				propertyAddress: "Property address",
				country: "Country",
				state: "State / Region",
				city: "City",
				propertyType: "Property type",
				floors: "Floors",
				password: "Password",
				confirmPassword: "Confirm password",
				agree: "I agree to the",
				partnerTerms: "hotel partner terms",
				submitting: "Submitting...",
				submit: "Submit property",
		  };

	return (
		<div className="listing-grid" dir={isArabic ? "rtl" : "ltr"}>
			<div className="listing-copy">
				<p className="eyebrow">{isArabic ? ar.partners : "For partners"}</p>
				<h2>{isArabic ? ar.title : "List your property with Jannat Booking"}</h2>
				<p>
					{isArabic
						? ar.copy
						: "Send the core property details and our team will review availability, policies, and onboarding for the booking platform."}
				</p>
				<div className="intro-points">
					{points.map((point) => (
						<span key={point}>
							<CheckCircle2 size={18} />
							{point}
						</span>
					))}
				</div>
			</div>

			<form className="auth-card listing-card premium-card" onSubmit={submit}>
				<div className="form-grid two">
					<label className="auth-field">
						<span>{labels.fullName}</span>
						<div>
							<UserRound size={17} />
							<input
								value={form.name}
								onChange={(event) => updateForm("name", event.target.value)}
								autoComplete="name"
								required
							/>
						</div>
					</label>
					<label className="auth-field">
						<span>{labels.email}</span>
						<div>
							<Mail size={17} />
							<input
								type="email"
								dir="ltr"
								value={form.email}
								onChange={(event) => updateForm("email", event.target.value)}
								autoComplete="email"
								required
							/>
						</div>
					</label>
					<label className="auth-field">
						<span>{labels.phone}</span>
						<div>
							<Phone size={17} />
							<input
								type="tel"
								dir="ltr"
								value={form.phone}
								onChange={(event) => updateForm("phone", event.target.value)}
								autoComplete="tel"
								required
							/>
						</div>
					</label>
					<label className="auth-field">
						<span>{labels.propertyName}</span>
						<div>
							<Building2 size={17} />
							<input
								value={form.hotelName}
								onChange={(event) => updateForm("hotelName", event.target.value)}
								required
							/>
						</div>
					</label>
					<label className="auth-field wide">
						<span>{labels.propertyAddress}</span>
						<div>
							<MapPin size={17} />
							<input
								value={form.hotelAddress}
								onChange={(event) => updateForm("hotelAddress", event.target.value)}
								required
							/>
						</div>
					</label>
					<label className="auth-field">
						<span>{labels.country}</span>
						<div>
							<MapPin size={17} />
							<select
								value={form.hotelCountry}
								onChange={(event) => updateForm("hotelCountry", event.target.value)}
								required
							>
								<option value="KSA">{isArabic ? "السعودية" : "KSA"}</option>
							</select>
						</div>
					</label>
					<label className="auth-field">
						<span>{labels.state}</span>
						<div>
							<MapPin size={17} />
							<select
								value={form.hotelState}
								onChange={(event) => updateLocation("hotelState", event.target.value)}
								required
							>
								<option value="">{isArabic ? "اختر المنطقة" : "Select state"}</option>
								{locationOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</label>
					<label className="auth-field">
						<span>{labels.city}</span>
						<div>
							<MapPin size={17} />
							<select
								value={form.hotelCity}
								onChange={(event) => updateLocation("hotelCity", event.target.value)}
								required
							>
								<option value="">{isArabic ? "اختر المدينة" : "Select city"}</option>
								{locationOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</label>
					<label className="auth-field">
						<span>{labels.propertyType}</span>
						<div>
							<Building2 size={17} />
							<select
								value={form.propertyType}
								onChange={(event) => updateForm("propertyType", event.target.value)}
								required
							>
								{propertyTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</div>
					</label>
					<label className="auth-field">
						<span>{labels.floors}</span>
						<div>
							<Hash size={17} />
							<input
								inputMode="numeric"
								value={form.hotelFloors}
								onChange={(event) => updateForm("hotelFloors", event.target.value)}
								required
							/>
						</div>
					</label>
					<label className="auth-field">
						<span>{labels.password}</span>
						<div>
							<LockKeyhole size={17} />
							<input
								type="password"
								value={form.password}
								onChange={(event) => updateForm("password", event.target.value)}
								autoComplete="new-password"
								required
							/>
						</div>
					</label>
					<label className="auth-field">
						<span>{labels.confirmPassword}</span>
						<div>
							<LockKeyhole size={17} />
							<input
								type="password"
								value={form.password2}
								onChange={(event) => updateForm("password2", event.target.value)}
								autoComplete="new-password"
								required
							/>
						</div>
					</label>
				</div>

				<label className="auth-check">
					<input
						type="checkbox"
						checked={form.acceptedTermsAndConditions}
						onChange={(event) =>
							updateForm("acceptedTermsAndConditions", event.target.checked)
						}
					/>
					<span>
						{labels.agree}{" "}
						<Link href={hrefWithLanguage("/terms-conditions?tab=hotel")}>
							{labels.partnerTerms}
						</Link>
						.
					</span>
				</label>

				{error ? <p className="auth-alert error">{error}</p> : null}
				{message ? <p className="auth-alert success">{message}</p> : null}

				<button className="btn btn-primary auth-submit" type="submit" disabled={busy}>
					{busy ? labels.submitting : labels.submit}
				</button>
			</form>
		</div>
	);
}
