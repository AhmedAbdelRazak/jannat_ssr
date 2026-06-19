"use client";

import Link from "next/link";
import { FacebookFilled, InstagramFilled, YoutubeFilled } from "@ant-design/icons";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import {
	ARABIC_BRAND_NAME,
	BRAND_NAME,
	CONTACT_EMAIL,
	DEFAULT_LOGO,
	PHONE_DISPLAY,
	WHATSAPP_NUMBER,
} from "../lib/constants";
import { slugifyHotel, titleCase } from "../lib/format";
import EmailText, { emailActionProps } from "./EmailText";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const footerSocialItems = [
	{ key: "facebook", label: "Facebook", Icon: FacebookFilled },
	{ key: "instagram", label: "Instagram", Icon: InstagramFilled },
	{ key: "youtube", label: "YouTube", Icon: YoutubeFilled },
];

export default function Footer({ website = {}, hotels = [], hasOffers = false }) {
	const { t, isArabic, hrefWithLanguage } = useJannatApp();
	const logo = website?.janatLogo?.url || DEFAULT_LOGO;
	const topHotels = Array.isArray(hotels) ? hotels.slice(0, 4) : [];
	const whatsapp = website?.whatsappNumber || WHATSAPP_NUMBER;
	const phone = website?.phone || PHONE_DISPLAY;
	const email = CONTACT_EMAIL;

	return (
		<footer className="footer" dir={isArabic ? "rtl" : "ltr"}>
			<div className="footer-overlay" />
			<div className="container footer-grid">
				<div className="footer-column footer-brand">
					<p>{t("footerTagline")}</p>
					<h3>{t("elegance")}</h3>
					<div className="socials">
						{footerSocialItems.map(({ key, label, Icon }) => (
							<Link
								href={hrefWithLanguage("/")}
								aria-label={label}
								title={label}
								key={key}
								onClick={() =>
									trackConversion(
										"socialClick",
										{ channel: key, placement: "footer" },
										[`Footer ${label}`]
									)
								}
							>
								<Icon aria-hidden="true" />
							</Link>
						))}
						<a
							href={`https://wa.me/${whatsapp}`}
							target="_blank"
							rel="noreferrer"
							aria-label="WhatsApp"
							onClick={() =>
								trackConversion(
									"contact",
									{ method: "footer_social_whatsapp" },
									["Footer Social WhatsApp"]
								)
							}
						>
							<MessageCircle size={24} />
						</a>
					</div>
					<span className="copyright">
						© {new Date().getFullYear()} {isArabic ? ARABIC_BRAND_NAME : BRAND_NAME}.
					</span>
				</div>

				<div className="footer-logo-wrap">
					<OptimizedImage
						src={logo}
						alt={BRAND_NAME}
						width={210}
						height={210}
						sizes="(max-width: 760px) 52vw, 210px"
						loading="eager"
					/>
				</div>

				<div className="footer-column footer-service">
					<h3>{t("service")}</h3>
					<a
						href={`tel:${phone.replace(/[^\d+]/g, "")}`}
						onClick={() =>
							trackConversion("contact", { method: "footer_phone" }, ["Footer Phone"])
						}
					>
						<Phone size={18} />
						<bdi dir="ltr" className="ltr-value">{phone}</bdi>
					</a>
					<a
						href={`https://wa.me/${whatsapp}`}
						target="_blank"
						rel="noreferrer"
						onClick={() =>
							trackConversion("contact", { method: "footer_whatsapp" }, ["Footer WhatsApp"])
						}
					>
						<MessageCircle size={18} />
						<bdi dir="ltr" className="ltr-value">{phone}</bdi>
					</a>
					<a
						onClick={() =>
							trackConversion("contact", { method: "footer_email" }, ["Footer Email"])
						}
						{...emailActionProps(email)}
					>
						<Mail size={18} />
						<EmailText email={email} />
					</a>
					<div className="newsletter">
						<strong>{isArabic ? "منصة حجوزات موثوقة منذ 2019" : "Trusted reservations since 2019"}</strong>
						<label>{t("newsletter")}</label>
						<input placeholder="your.email@example.com" />
						<button type="button">{t("newsletterButton")}</button>
					</div>
				</div>
			</div>
			<div className="container footer-links">
				<Link href={hrefWithLanguage("/rooms")}>{t("searchRooms")}</Link>
				{hasOffers ? <Link href={hrefWithLanguage("/jannat-offers-monthly-reservations")}>
					{isArabic ? "العروض" : "Offers"}
				</Link> : null}
				<Link href={hrefWithLanguage("/terms-conditions?tab=guest")}>
					{isArabic ? "الشروط" : "Terms"}
				</Link>
				<Link href={hrefWithLanguage("/terms-conditions?tab=privacy")}>
					{isArabic ? "الخصوصية" : "Privacy"}
				</Link>
				<Link href={hrefWithLanguage("/list-property")}>
					{isArabic ? "أضف فندقك" : "List property"}
				</Link>
				{topHotels.map((hotel) => (
					<Link key={hotel._id} href={hrefWithLanguage(`/single-hotel/${slugifyHotel(hotel.hotelName)}`)}>
						{isArabic && hotel.hotelName_OtherLanguage ? hotel.hotelName_OtherLanguage : titleCase(hotel.hotelName)}
					</Link>
				))}
			</div>
		</footer>
	);
}
