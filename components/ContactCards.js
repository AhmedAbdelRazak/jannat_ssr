"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import EmailText, { emailActionProps } from "./EmailText";
import { useJannatApp } from "./JannatAppProvider";

export default function ContactCards({ email, phone, whatsapp }) {
	const { t, isArabic } = useJannatApp();
	return (
		<div className="container contact-grid" dir={isArabic ? "rtl" : "ltr"}>
			<a
				className="contact-card premium-card"
				onClick={() => trackConversion("contact", { method: "email" }, ["Contact Email"])}
				{...emailActionProps(email)}
			>
				<Mail size={24} />
				<span>{t("emailAddress")}</span>
				<EmailText email={email} as="strong" />
			</a>
			<a
				className="contact-card premium-card"
				href={`tel:${phone.replace(/[^\d+]/g, "")}`}
				onClick={() => trackConversion("contact", { method: "phone" }, ["Contact Phone"])}
			>
				<Phone size={24} />
				<span>{t("phone")}</span>
				<strong dir="ltr" className="ltr-value">{phone}</strong>
			</a>
			<a
				className="contact-card premium-card"
				href={`https://wa.me/${whatsapp}`}
				target="_blank"
				rel="noreferrer"
				onClick={() => trackConversion("contact", { method: "whatsapp" }, ["Contact WhatsApp"])}
			>
				<MessageCircle size={24} />
				<span>{t("whatsapp")}</span>
				<strong dir="ltr" className="ltr-value">{phone}</strong>
			</a>
		</div>
	);
}
