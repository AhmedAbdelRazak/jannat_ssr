"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import { BRAND_URL } from "../lib/constants";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const isJannatHost = (hostname = "") =>
	["jannatbooking.com", "www.jannatbooking.com"].includes(String(hostname || "").toLowerCase());

const bannerHref = (rawHref = "", hrefWithLanguage) => {
	const href = String(rawHref || "").trim();
	if (!href) return "";
	try {
		const url = new URL(href, BRAND_URL);
		if (isJannatHost(url.hostname)) {
			return hrefWithLanguage(`${url.pathname}${url.search}${url.hash}`);
		}
		return url.href;
	} catch (_error) {
		return href.startsWith("/") ? hrefWithLanguage(href) : "";
	}
};

export default function HomePromoBanner({ banner = {}, position = "second" }) {
	const { isArabic, hrefWithLanguage } = useJannatApp();
	const imageUrl = banner?.url || banner?.cloudinary_url || "";
	if (!imageUrl) return null;

	const href = bannerHref(banner.pageRedirectURL, hrefWithLanguage);
	const external = /^https?:\/\//i.test(href) && !isJannatHost(new URL(href).hostname);
	const title =
		(isArabic ? banner.titleArabic || banner.title : banner.title) ||
		(isArabic ? "\u0639\u0631\u0636 \u0645\u062e\u062a\u0627\u0631 \u0645\u0646 \u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u062c" : "Selected Jannat Booking offer");
	const label = isArabic ? "\u0639\u0631\u0636 \u0645\u062e\u062a\u0627\u0631" : "Featured offer";
	const clickPayload = {
		content_name: title,
		content_type: "home_promo_banner",
		item_id: position,
		promotion_id: `home_${position}_banner`,
		creative_name: title,
		destination: href || undefined,
	};

	const content = (
		<>
			<span className="home-promo-shine" aria-hidden="true" />
			<span className="home-promo-badge">
				<Sparkles size={15} />
				{label}
			</span>
			<OptimizedImage
				src={imageUrl}
				alt={title}
				width={1180}
				height={350}
				sizes="(max-width: 760px) calc(100vw - 32px), 980px"
				quality={80}
				unoptimized={false}
			/>
			{href ? (
				<span className="home-promo-action" aria-hidden="true">
					{isArabic ? "\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0644\u0639\u0631\u0636" : "Explore offer"}
					<ArrowRight size={16} />
				</span>
			) : null}
		</>
	);

	const handleClick = () => {
		trackConversion(
			"promoClick",
			clickPayload,
			[
				`User Clicked on Banner ${position === "third" ? "3" : "2"} In Home Page`,
				"Home Promo Banner Click",
			]
		);
	};

	return (
		<section className={`home-promo-section home-promo-${position}`} dir={isArabic ? "rtl" : "ltr"}>
			<div className="container home-promo-container">
				{href ? (
					external ? (
						<a
							className="home-promo-card is-clickable"
							href={href}
							target="_blank"
							rel="noreferrer"
							onClick={handleClick}
							aria-label={title}
						>
							{content}
						</a>
					) : (
						<Link
							className="home-promo-card is-clickable"
							href={href}
							onClick={handleClick}
							aria-label={title}
						>
							{content}
						</Link>
					)
				) : (
					<div className="home-promo-card" aria-label={title}>
						{content}
					</div>
				)}
			</div>
		</section>
	);
}
