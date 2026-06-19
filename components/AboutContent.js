"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
	BadgeCheck,
	Building2,
	CalendarCheck2,
	CreditCard,
	Handshake,
	Headset,
	MapPinned,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { absoluteApiUrl, apiUrl } from "../lib/api";
import {
	ARABIC_BRAND_NAME,
	BRAND_NAME,
	CONTACT_EMAIL,
	FOUNDING_YEAR,
	PAYMENT_METHODS,
	PHONE_DISPLAY,
} from "../lib/constants";
import { useJannatApp } from "./JannatAppProvider";

const fallbackArabic =
	`<h2>${ARABIC_BRAND_NAME}</h2><p>تساعد ${ARABIC_BRAND_NAME} الحجاج والمعتمرين والمسافرين في حجز فنادق مكة والمدينة مع خيارات غرف واضحة وأسعار حسب التواريخ ودعم سريع وسجل حجوزات يتم عرضه بشفافية من النظام.</p>`;
const fallbackEnglish =
	"<h2>Jannat Booking</h2><p>Jannat Booking helps pilgrims and travelers book Makkah and Madinah hotels with clear room choices, date-based pricing, and responsive support. The platform displays its reservation activity transparently from the system.</p>";

const labels = {
	en: {
		eyebrow: "Built for Umrah, Haj, and Saudi stays",
		title: "A clearer way to reserve Makkah and Madinah hotels.",
		copy:
			"Jannat Booking connects guests with selected hotels, clear room options, secure payment paths, and responsive support so each stay can be arranged with confidence.",
		ctaHotels: "Explore hotels",
		ctaContact: "Contact support",
		proofTitle: "Why guests choose Jannat Booking",
		storyTitle: "A reservation platform made for peace of mind",
		storyCopy:
			"Since 2019, Jannat Booking has focused on hotel reservations for travelers who need clarity before they travel: real room choices, date-based pricing, support when plans change, and coordination with the hotel reception instead of unnecessary middlemen.",
		processTitle: "How we help",
		contentTitle: "More about Jannat Booking",
		contactTitle: "Need help choosing a hotel?",
		contactCopy:
			"Our support team can help compare hotels, room types, availability, payments, and reservation questions.",
		emailLabel: "Email",
		phoneLabel: "WhatsApp / phone",
		paymentLine: `Secure payment options include ${PAYMENT_METHODS.slice(0, 4).join(", ")}.`,
		stats: [
			{
				key: "founded",
				value: FOUNDING_YEAR,
				label: "Serving travelers since",
				icon: CalendarCheck2,
				tone: "blue",
			},
			{
				key: "reservations",
				label: "Reservations recorded",
				icon: BadgeCheck,
				tone: "green",
				loadingLabel: "Loading reservation count",
				unavailableLabel: "Reservation count unavailable",
			},
			{
				key: "coverage",
				value: "Makkah & Madinah",
				label: "Focused hotel coverage",
				icon: MapPinned,
				tone: "teal",
			},
			{
				key: "payments",
				value: "PayPal + cards",
				label: "Secure payment options",
				icon: CreditCard,
				tone: "gold",
			},
		],
		pillars: [
			{
				icon: ShieldCheck,
				title: "Secure reservation flow",
				copy: "Payment and booking details are handled through secure checkout and verified reservation paths.",
			},
			{
				icon: Handshake,
				title: "Reception-led coordination",
				copy: "Guests are guided toward hotel-level confirmation, so reservation details remain clear and practical.",
			},
			{
				icon: Headset,
				title: "Responsive support",
				copy: "Support is available for room questions, payments, existing reservations, and urgent help.",
			},
		],
		steps: [
			{ icon: MapPinned, title: "Choose the right area", copy: "Compare selected hotels near Al Haram and key Saudi destinations." },
			{ icon: Building2, title: "Review real room options", copy: "See room types, pricing, photos, policies, and availability by date." },
			{ icon: CreditCard, title: "Use secure payment paths", copy: "Pay online where available through PayPal or supported major cards." },
			{ icon: CalendarCheck2, title: "Travel with clarity", copy: "Keep reservation details, dates, and support access organized." },
		],
	},
	ar: {
		eyebrow: "مصممة للعمرة والحج والإقامات في السعودية",
		title: "طريقة أوضح لحجز فنادق مكة والمدينة.",
		copy:
			`تربط ${ARABIC_BRAND_NAME} الضيوف بفنادق مختارة، وخيارات غرف واضحة، ومسارات دفع آمنة، ودعم سريع حتى تتم الرحلة بثقة وراحة.`,
		ctaHotels: "استكشف الفنادق",
		ctaContact: "تواصل مع الدعم",
		proofTitle: `لماذا يختار الضيوف ${ARABIC_BRAND_NAME}`,
		storyTitle: "منصة حجز تمنحك راحة البال",
		storyCopy:
			`منذ عام 2019، تركز ${ARABIC_BRAND_NAME} على حجوزات الفنادق للمسافرين الذين يحتاجون الوضوح قبل السفر: خيارات غرف حقيقية، وأسعار حسب التواريخ، ودعم عند تغير الخطط، وتنسيق مع استقبال الفندق دون وسطاء غير ضروريين.`,
		processTitle: "كيف نساعدك",
		contentTitle: `المزيد عن ${ARABIC_BRAND_NAME}`,
		contactTitle: "تحتاج مساعدة في اختيار الفندق؟",
		contactCopy:
			"يمكن لفريق الدعم مساعدتك في مقارنة الفنادق وأنواع الغرف والتوفر وخيارات الدفع وأسئلة الحجز.",
		emailLabel: "البريد الإلكتروني",
		phoneLabel: "واتساب / الهاتف",
		paymentLine: "خيارات الدفع الآمنة تشمل PayPal و Visa و Mastercard و American Express.",
		stats: [
			{
				key: "founded",
				value: FOUNDING_YEAR,
				label: "نخدم المسافرين منذ",
				icon: CalendarCheck2,
				tone: "blue",
			},
			{
				key: "reservations",
				label: "حجوزات مع جنات بوكينج",
				icon: BadgeCheck,
				tone: "green",
				loadingLabel: "تحميل عدد الحجوزات",
				unavailableLabel: "تعذر تحميل عدد الحجوزات",
			},
			{
				key: "coverage",
				value: "مكة والمدينة",
				label: "تغطية فندقية متخصصة",
				icon: MapPinned,
				tone: "teal",
			},
			{
				key: "payments",
				value: "PayPal + بطاقات",
				label: "خيارات دفع آمنة",
				icon: CreditCard,
				tone: "gold",
			},
		],
		pillars: [
			{
				icon: ShieldCheck,
				title: "مسار حجز آمن",
				copy: "يتم التعامل مع بيانات الدفع والحجز عبر مسارات دفع وتأكيد آمنة وواضحة.",
			},
			{
				icon: Handshake,
				title: "تنسيق مع استقبال الفندق",
				copy: "يتم توجيه الضيف نحو تأكيد واضح على مستوى الفندق حتى تبقى تفاصيل الحجز عملية ومفهومة.",
			},
			{
				icon: Headset,
				title: "دعم سريع",
				copy: "الدعم متاح لأسئلة الغرف والدفع والحجوزات القائمة والمساعدة العاجلة.",
			},
		],
		steps: [
			{ icon: MapPinned, title: "اختر المنطقة المناسبة", copy: "قارن فنادق مختارة قرب الحرم وفي أهم الوجهات السعودية." },
			{ icon: Building2, title: "راجع خيارات الغرف", copy: "اطلع على أنواع الغرف والأسعار والصور والسياسات والتوفر حسب التاريخ." },
			{ icon: CreditCard, title: "استخدم دفعا آمنا", copy: "ادفع إلكترونيا عند توفر الخيار عبر PayPal أو البطاقات الرئيسية المدعومة." },
			{ icon: CalendarCheck2, title: "سافر بوضوح", copy: "احتفظ بتفاصيل الحجز والتواريخ وخيارات الدعم بشكل منظم." },
		],
	},
};

const resolveReservationCount = (count) => {
	const numericCount = Number(count);
	return Number.isFinite(numericCount) && numericCount > 0
		? Math.floor(numericCount)
		: null;
};

const formatNumber = (count) =>
	new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 0,
	}).format(Math.max(0, Math.floor(Number(count) || 0)));

const formatReservationCount = (count) => {
	const numericCount = resolveReservationCount(count);
	return numericCount ? `+${formatNumber(numericCount)}` : "";
};

let reservationStatsInFlight = null;

const fetchReservationStatsOnce = (urls = []) => {
	if (reservationStatsInFlight) return reservationStatsInFlight;

	reservationStatsInFlight = (async () => {
		const controller = new AbortController();
		const timeout = window.setTimeout(() => controller.abort(), 3000);

		try {
			for (const url of [...new Set(urls)]) {
				try {
					const response = await fetch(url, {
						headers: { Accept: "application/json" },
						signal: controller.signal,
					});
					if (!response.ok) continue;
					const data = await response.json();
					const nextCount = resolveReservationCount(
						data?.reservationsCount ?? data?.count ?? data?.totalReservations
					);
					if (nextCount) return nextCount;
				} catch (_error) {
					if (controller.signal.aborted) return null;
				}
			}
			return null;
		} finally {
			window.clearTimeout(timeout);
			reservationStatsInFlight = null;
		}
	})();

	return reservationStatsInFlight;
};

const isDirectionalNumber = (value) =>
	/^[+\-]?\s*[\d,.]+$/.test(String(value || "").trim());

const normalizeRichTextHtml = (html = "", isArabic = false) => {
	let withoutEditorSpacing = String(html || "")
		.replace(/\sstyle=(["'])(?=[^"']*direction\s*:\s*ltr)[^"']*\1/gi, "");
	const emptyBlockPattern =
		/<(p|h[1-6])\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>|<\/?(?:strong|b|em|i|u|span)\b[^>]*>)*<\/\1>/gi;
	let previousHtml = "";

	withoutEditorSpacing = withoutEditorSpacing.replace(
		/<p\b[^>]*>\s*(?:<strong\b[^>]*>)?\s*Keywords\s+for\s+SEO\s*:?\s*e\.?\s*(?:<\/strong>)?\s*<\/p>/gi,
		""
	);

	while (previousHtml !== withoutEditorSpacing) {
		previousHtml = withoutEditorSpacing;
		withoutEditorSpacing = withoutEditorSpacing.replace(emptyBlockPattern, "");
	}

	return isArabic
		? withoutEditorSpacing.replace(/<a\b(?![^>]*\bdir=)/gi, '<a dir="ltr"')
		: withoutEditorSpacing;
};

function AnimatedReservationCount({ count, fallbackLabel }) {
	const numericCount = resolveReservationCount(count);
	const [displayCount, setDisplayCount] = useState(numericCount);

	useEffect(() => {
		if (!numericCount) {
			setDisplayCount(null);
			return undefined;
		}

		const startValue = Math.max(0, Math.floor(numericCount * 0.82));
		const duration = 1150;
		let frameId = 0;
		let startTime = 0;
		setDisplayCount(startValue);

		const tick = (time) => {
			if (!startTime) startTime = time;
			const progress = Math.min((time - startTime) / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3);
			setDisplayCount(Math.round(startValue + (numericCount - startValue) * eased));
			if (progress < 1) frameId = window.requestAnimationFrame(tick);
		};

		frameId = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(frameId);
	}, [numericCount]);

	if (!numericCount) {
		return (
			<span className="about-stat-value is-unavailable" aria-label={fallbackLabel}>
				-
			</span>
		);
	}

	return (
		<bdi dir="ltr" className="about-stat-value ltr-value" aria-label={formatReservationCount(numericCount)}>
			+{formatNumber(displayCount || numericCount)}
		</bdi>
	);
}

export default function AboutContent({
	englishHtml = "",
	arabicHtml = "",
	reservationCount = null,
}) {
	const { isArabic, hrefWithLanguage } = useJannatApp();
	const copy = isArabic ? labels.ar : labels.en;
	const initialReservationCount = resolveReservationCount(reservationCount);
	const [reservationStats, setReservationStats] = useState({
		count: initialReservationCount,
		status: initialReservationCount ? "ready" : "idle",
	});
	const normalizedReservationCount = reservationStats.count;

	useEffect(() => {
		if (!initialReservationCount) return;
		setReservationStats({ count: initialReservationCount, status: "ready" });
	}, [initialReservationCount]);

	useEffect(() => {
		if (initialReservationCount) return undefined;
		let isMounted = true;
		const urls =
			process.env.NODE_ENV !== "production"
				? [
						absoluteApiUrl("http://localhost:8080/api", "/public-reservation-stats"),
						apiUrl("/public-reservation-stats"),
					]
				: [apiUrl("/public-reservation-stats")];
		setReservationStats({ count: null, status: "loading" });

		fetchReservationStatsOnce(urls).then((nextCount) => {
			if (!isMounted) return;
			setReservationStats(
				nextCount
					? { count: nextCount, status: "ready" }
					: { count: null, status: "unavailable" }
			);
		});

		return () => {
			isMounted = false;
		};
	}, [initialReservationCount]);

	const dynamicStats = useMemo(
		() =>
			copy.stats.map((stat) =>
				stat.key === "reservations"
					? {
							...stat,
							value: normalizedReservationCount
								? formatReservationCount(normalizedReservationCount)
								: stat.unavailableLabel,
							numericValue: normalizedReservationCount,
							status: reservationStats.status,
						}
					: stat
			),
		[copy.stats, normalizedReservationCount, reservationStats.status]
	);
	const rawHtml = (isArabic && arabicHtml) || (isArabic ? fallbackArabic : "") || englishHtml || fallbackEnglish;
	const htmlWithDynamicCounts = isArabic
		? rawHtml
				.replace(/\bJannat\s+Booking\b/g, ARABIC_BRAND_NAME)
				.replace(/جنة\s+بوك(?:ينج|نج)/g, ARABIC_BRAND_NAME)
				.replace(/حجز\s+جنات/g, ARABIC_BRAND_NAME)
				.replace(/أكثر\s+من\s*10,000\s+حجز/g, normalizedReservationCount ? `<bdi dir="ltr">${formatReservationCount(normalizedReservationCount)}</bdi> حجز` : "سجل حجوزات متنام")
		: rawHtml.replace(
				/more than\s*10,000\s+reservations/gi,
				normalizedReservationCount
					? `${formatReservationCount(normalizedReservationCount)} reservations`
					: "a growing reservation record"
			);
	const html = normalizeRichTextHtml(htmlWithDynamicCounts, isArabic);

	return (
		<div className="about-page" dir={isArabic ? "rtl" : "ltr"}>
			<section className="about-proof-section">
				<div className="container about-proof-grid">
					{dynamicStats.map((stat) => {
						const Icon = stat.icon || BadgeCheck;
						const ltrValue = isDirectionalNumber(stat.value);
						return (
							<div
								className={`about-stat premium-card tone-${stat.tone || "blue"} ${stat.key === "reservations" ? "is-reservation-stat" : ""}`}
								key={stat.key || `${stat.value}-${stat.label}`}
							>
								<span className="about-stat-icon" aria-hidden="true">
									<Icon size={21} />
								</span>
								<div className="about-stat-copy">
									{stat.key === "reservations" ? (
										<AnimatedReservationCount
											count={stat.numericValue}
											fallbackLabel={stat.status === "loading" ? stat.loadingLabel : stat.unavailableLabel}
										/>
									) : ltrValue ? (
										<bdi
											dir="ltr"
											className="about-stat-value ltr-value"
										>
											{stat.value}
										</bdi>
									) : (
										<span className="about-stat-value">
											{stat.value}
										</span>
									)}
									<p>{stat.label}</p>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			<section className="section about-story-section">
				<div className="container about-story-layout">
					<article className="about-story-card premium-card">
						<p className="eyebrow">{copy.eyebrow}</p>
						<h2>{copy.title}</h2>
						<p>{copy.copy}</p>
						<div className="about-actions">
							<Link className="btn btn-primary" href={hrefWithLanguage("/our-hotels")}>
								<Sparkles size={18} />
								{copy.ctaHotels}
							</Link>
							<Link className="btn btn-ghost" href={hrefWithLanguage("/contact")}>
								<Headset size={18} />
								{copy.ctaContact}
							</Link>
						</div>
					</article>

					<aside className="about-story-side premium-card">
						<BadgeCheck size={26} />
						<h3>{copy.storyTitle}</h3>
						<p>{copy.storyCopy}</p>
						<span>{copy.paymentLine}</span>
					</aside>
				</div>
			</section>

			<section className="section about-trust-section">
				<div className="container">
					<div className="section-head">
						<div>
							<p className="eyebrow">{isArabic ? ARABIC_BRAND_NAME : BRAND_NAME}</p>
							<h2 className="section-title">{copy.proofTitle}</h2>
						</div>
					</div>
					<div className="about-pillar-grid">
						{copy.pillars.map(({ icon: Icon, title, copy: body }) => (
							<article className="about-pillar premium-card" key={title}>
								<span className="about-icon">
									<Icon size={22} />
								</span>
								<h3>{title}</h3>
								<p>{body}</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section className="section about-process-section">
				<div className="container about-process-layout">
					<div>
						<p className="eyebrow">{copy.processTitle}</p>
						<h2 className="section-title">{copy.storyTitle}</h2>
					</div>
					<div className="about-step-grid">
						{copy.steps.map(({ icon: Icon, title, copy: body }, index) => (
							<article className="about-step" key={title}>
								<span>
									<Icon size={19} />
								</span>
								<bdi dir="ltr">{String(index + 1).padStart(2, "0")}</bdi>
								<h3>{title}</h3>
								<p>{body}</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section className="section about-managed-section">
				<div className="container about-managed-layout">
					<aside className="about-contact-card premium-card">
						<Headset size={24} />
						<h2>{copy.contactTitle}</h2>
						<p>{copy.contactCopy}</p>
						<div>
							<span>{copy.emailLabel}</span>
							<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
						</div>
						<div>
							<span>{copy.phoneLabel}</span>
							<a href="https://wa.me/19092223374" target="_blank" rel="noreferrer">
								{PHONE_DISPLAY}
							</a>
						</div>
					</aside>
					<article className="about-managed-copy premium-card" dir={isArabic ? "rtl" : "ltr"}>
						<p className="eyebrow">{copy.contentTitle}</p>
						<div
							className="content-prose about-rich-prose"
							dir={isArabic ? "rtl" : "ltr"}
							dangerouslySetInnerHTML={{ __html: html }}
						/>
					</article>
				</div>
			</section>
		</div>
	);
}
