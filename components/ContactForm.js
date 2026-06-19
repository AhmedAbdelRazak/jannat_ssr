"use client";

import { useMemo, useState } from "react";
import {
	BadgeCheck,
	CalendarCheck2,
	Headset,
	Hotel,
	Mail,
	MessageCircle,
	Phone,
	Send,
	ShieldCheck,
	UserRound,
} from "lucide-react";
import { postJson } from "../lib/api";
import { trackConversion } from "../lib/analyticsEvents";
import { ARABIC_BRAND_NAME, BRAND_NAME } from "../lib/constants";
import { useJannatApp } from "./JannatAppProvider";

const topicOptions = {
	en: [
		{ value: "room_availability", label: "Room availability and prices" },
		{ value: "reservation_update", label: "Existing reservation" },
		{ value: "payment_inquiry", label: "Payment or invoice" },
		{ value: "cancellation_request", label: "Cancellation or change request" },
		{ value: "hotel_question", label: "Hotel or room question" },
		{ value: "general_support", label: "General support" },
	],
	ar: [
		{ value: "room_availability", label: "توفر الغرف والأسعار" },
		{ value: "reservation_update", label: "حجز قائم" },
		{ value: "payment_inquiry", label: "الدفع أو الفاتورة" },
		{ value: "cancellation_request", label: "طلب إلغاء أو تعديل" },
		{ value: "hotel_question", label: "استفسار عن فندق أو غرفة" },
		{ value: "general_support", label: "دعم عام" },
	],
};

const copy = {
	en: {
		eyebrow: "Support request",
		title: "Send your message to Jannat Booking",
		intro:
			"Share your reservation question, preferred hotel, payment issue, or travel dates and our customer-support team will follow up.",
		name: "Full name",
		email: "Email",
		phone: "Phone or WhatsApp",
		preferredContact: "Preferred contact",
		emailPreferred: "Email",
		phonePreferred: "Phone / WhatsApp",
		topic: "Inquiry about",
		reservationReference: "Reservation reference",
		hotelName: "Hotel or destination",
		message: "Message",
		messagePlaceholder:
			"Tell us the dates, number of guests, room type, payment question, or anything support should know.",
		send: "Send to support",
		sending: "Sending...",
		successTitle: "Your request reached Jannat Booking support.",
		successCopy: "A customer-service team member can now review it inside the admin support desk.",
		reference: "Support reference",
		errorRequired: "Please add your name, email or phone, topic, and message.",
		trustTitle: "Handled by customer support",
		trustCopy:
			"Your request opens as a customer-service case, so the admin team can track replies, history, and follow-up status from one place.",
		points: ["Secure support queue", "Reservation context saved", "Direct follow-up"],
	},
	ar: {
		eyebrow: "طلب دعم",
		title: `أرسل رسالتك إلى ${ARABIC_BRAND_NAME}`,
		intro:
			"شاركنا استفسار الحجز أو الفندق المطلوب أو مشكلة الدفع أو تواريخ السفر، وسيقوم فريق خدمة العملاء بالمتابعة.",
		name: "الاسم الكامل",
		email: "البريد الإلكتروني",
		phone: "رقم الجوال أو واتساب",
		preferredContact: "طريقة التواصل المفضلة",
		emailPreferred: "البريد الإلكتروني",
		phonePreferred: "الجوال / واتساب",
		topic: "الاستفسار عن",
		reservationReference: "رقم أو مرجع الحجز",
		hotelName: "الفندق أو الوجهة",
		message: "الرسالة",
		messagePlaceholder:
			"اكتب التواريخ، عدد الضيوف، نوع الغرفة، سؤال الدفع، أو أي تفاصيل يحتاجها فريق الدعم.",
		send: "إرسال إلى الدعم",
		sending: "جاري الإرسال...",
		successTitle: `وصل طلبك إلى دعم ${ARABIC_BRAND_NAME}.`,
		successCopy: "يمكن لفريق خدمة العملاء الآن مراجعته داخل لوحة دعم العملاء.",
		reference: "مرجع الدعم",
		errorRequired: "يرجى إضافة الاسم والبريد أو الجوال والموضوع والرسالة.",
		trustTitle: "يتعامل معه فريق خدمة العملاء",
		trustCopy:
			"يفتح طلبك كحالة دعم للعملاء حتى يتمكن فريق الإدارة من متابعة الردود والسجل وحالة المتابعة من مكان واحد.",
		points: ["قائمة دعم آمنة", "حفظ تفاصيل الحجز", "متابعة مباشرة"],
	},
};

const initialForm = {
	fullName: "",
	email: "",
	phone: "",
	preferredContact: "whatsapp",
	inquiryAbout: "room_availability",
	reservationReference: "",
	hotelName: "",
	message: "",
	website: "",
};

export default function ContactForm() {
	const { isArabic, language } = useJannatApp();
	const text = copy[isArabic ? "ar" : "en"];
	const topics = topicOptions[isArabic ? "ar" : "en"];
	const [form, setForm] = useState(initialForm);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(null);

	const brandName = isArabic ? ARABIC_BRAND_NAME : BRAND_NAME;
	const selectedTopicLabel = useMemo(
		() => topics.find((topic) => topic.value === form.inquiryAbout)?.label || topics[0].label,
		[form.inquiryAbout, topics]
	);

	const updateField = (key, value) => {
		setError("");
		setForm((current) => ({ ...current, [key]: value }));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError("");
		setSuccess(null);
		const hasContact = form.email.trim() || form.phone.trim();
		if (!form.fullName.trim() || !hasContact || !form.inquiryAbout || !form.message.trim()) {
			setError(text.errorRequired);
			return;
		}

		setSubmitting(true);
		try {
			const data = await postJson("/support-cases/contact", {
				...form,
				language: isArabic ? "Arabic" : "English",
				languageCode: language,
				sourceUrl: typeof window !== "undefined" ? window.location.href : "",
			});
			setSuccess(data?._id ? data : { success: true });
			setForm(initialForm);
			trackConversion(
				"contactSubmit",
				{
					content_name: brandName,
					content_type: "support_case",
					inquiry: form.inquiryAbout,
					inquiry_label: selectedTopicLabel,
				},
				["Contact Form Submitted", "Customer Support Lead"]
			);
		} catch (err) {
			setError(err?.message || text.errorRequired);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="container contact-layout" dir={isArabic ? "rtl" : "ltr"}>
			<form className="contact-form-card premium-card" onSubmit={handleSubmit}>
				<div className="contact-form-head">
					<span aria-hidden="true">
						<Headset size={22} />
					</span>
					<div>
						<p className="eyebrow">{text.eyebrow}</p>
						<h2>{text.title}</h2>
						<p>{text.intro}</p>
					</div>
				</div>

				<div className="form-grid two">
					<label>
						<span>{text.name} *</span>
						<div className="input-shell">
							<UserRound size={17} />
							<input
								value={form.fullName}
								onChange={(event) => updateField("fullName", event.target.value)}
								autoComplete="name"
								maxLength={80}
								required
							/>
						</div>
					</label>
					<label>
						<span>{text.topic} *</span>
						<div className="input-shell">
							<BadgeCheck size={17} />
							<select
								value={form.inquiryAbout}
								onChange={(event) => updateField("inquiryAbout", event.target.value)}
								required
							>
								{topics.map((topic) => (
									<option key={topic.value} value={topic.value}>
										{topic.label}
									</option>
								))}
							</select>
						</div>
					</label>
					<label>
						<span>{text.email}</span>
						<div className="input-shell">
							<Mail size={17} />
							<input
								type="email"
								value={form.email}
								onChange={(event) => updateField("email", event.target.value)}
								autoComplete="email"
								maxLength={120}
							/>
						</div>
					</label>
					<label>
						<span>{text.phone}</span>
						<div className="input-shell">
							<Phone size={17} />
							<input
								value={form.phone}
								onChange={(event) => updateField("phone", event.target.value)}
								autoComplete="tel"
								maxLength={40}
								dir="ltr"
							/>
						</div>
					</label>
					<label>
						<span>{text.preferredContact}</span>
						<div className="input-shell">
							<MessageCircle size={17} />
							<select
								value={form.preferredContact}
								onChange={(event) => updateField("preferredContact", event.target.value)}
							>
								<option value="whatsapp">{text.phonePreferred}</option>
								<option value="email">{text.emailPreferred}</option>
							</select>
						</div>
					</label>
					<label>
						<span>{text.reservationReference}</span>
						<div className="input-shell">
							<CalendarCheck2 size={17} />
							<input
								value={form.reservationReference}
								onChange={(event) => updateField("reservationReference", event.target.value)}
								maxLength={80}
							/>
						</div>
					</label>
				</div>

				<label>
					<span>{text.hotelName}</span>
					<div className="input-shell">
						<Hotel size={17} />
						<input
							value={form.hotelName}
							onChange={(event) => updateField("hotelName", event.target.value)}
							maxLength={160}
						/>
					</div>
				</label>

				<label>
					<span>{text.message} *</span>
					<textarea
						value={form.message}
						onChange={(event) => updateField("message", event.target.value)}
						placeholder={text.messagePlaceholder}
						rows={6}
						maxLength={5000}
						required
					/>
				</label>

				<label className="contact-honeypot" aria-hidden="true">
					<span>Website</span>
					<input
						tabIndex={-1}
						value={form.website}
						onChange={(event) => updateField("website", event.target.value)}
						autoComplete="off"
					/>
				</label>

				{error && <p className="form-alert error">{error}</p>}
				{success && (
					<div className="form-alert success">
						<strong>{text.successTitle}</strong>
						<span>{text.successCopy}</span>
						{success._id && (
							<small>
								{text.reference}: <bdi dir="ltr">{success._id.slice(-8).toUpperCase()}</bdi>
							</small>
						)}
					</div>
				)}

				<button className="btn btn-primary contact-submit" type="submit" disabled={submitting}>
					<Send size={18} />
					{submitting ? text.sending : text.send}
				</button>
			</form>

			<aside className="contact-support-card premium-card">
				<ShieldCheck size={26} />
				<p className="eyebrow">{brandName}</p>
				<h2>{text.trustTitle}</h2>
				<p>{text.trustCopy}</p>
				<div>
					{text.points.map((point) => (
						<span key={point}>
							<BadgeCheck size={16} />
							{point}
						</span>
					))}
				</div>
			</aside>
		</div>
	);
}
