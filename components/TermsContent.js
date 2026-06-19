"use client";

import Link from "next/link";
import {
	BadgeCheck,
	Building2,
	CheckCircle2,
	CreditCard,
	FileText,
	Handshake,
	Headset,
	LockKeyhole,
	ShieldCheck,
	UserCheck,
} from "lucide-react";
import {
	ARABIC_BRAND_NAME,
	BRAND_NAME,
	CONTACT_EMAIL,
	FOUNDING_YEAR,
	PAYMENT_METHODS,
	PHONE_DISPLAY,
} from "../lib/constants";
import EmailText, { emailActionProps } from "./EmailText";
import { useJannatApp } from "./JannatAppProvider";

const tabOrder = ["guest", "hotel", "privacy"];

const labels = {
	en: {
		eyebrow: "Legal center",
		title: "Clear policies for safer hotel reservations",
		copy:
			"Review the guest terms, hotel partner expectations, and privacy practices behind the Jannat Booking experience.",
		documentLabel: "Policy document",
		summaryTitle: "What this covers",
		trustTitle: "Trust and payment",
		trustCopy:
			"Jannat Booking has served hotel reservation guests since 2019 with secure payment-support flows, direct hotel-reception coordination, and public policy pages that are easy to review before booking.",
		contactTitle: "Need help with a policy?",
		contactCopy: "Support can help explain reservation, payment, cancellation, and privacy questions before you continue.",
		emailLabel: "Email support",
		phoneLabel: "Phone / WhatsApp",
		updated: "Public customer-facing policy",
		viewing: "You are viewing",
		paymentSummary: `${PAYMENT_METHODS.slice(0, 4).join(", ")} supported where available`,
		tabs: {
			guest: {
				label: "Guest terms",
				title: "Guest Terms and Conditions",
				kicker: "For travelers and reservation guests",
				icon: UserCheck,
				summary: [
					"Booking requests, availability, pricing, payment, cancellation, and support expectations.",
					"How confirmation depends on the selected hotel, room type, travel dates, and payment path.",
					"How Jannat Booking coordinates details with hotel reception teams where possible.",
				],
			},
			hotel: {
				label: "Hotel partner terms",
				title: "Hotel Partner Terms",
				kicker: "For listed and onboarding hotel partners",
				icon: Building2,
				summary: [
					"Expectations for accurate room availability, pricing, taxes, policies, and operational updates.",
					"How partner hotels support reservation confirmation, guest communication, and service delivery.",
					"How public listings should stay clear, truthful, and current for guest trust.",
				],
			},
			privacy: {
				label: "Privacy policy",
				title: "Privacy Policy",
				kicker: "For guest, account, and reservation data",
				icon: LockKeyhole,
				summary: [
					"How guest and reservation information is used to process requests and support service.",
					"How payment-support, account, hotel communication, and customer-service data are handled.",
					"How private payment, dashboard, and reservation routes are kept away from public indexing.",
				],
			},
		},
		trustItems: [
			{ icon: CreditCard, title: "Secure payment paths", copy: "PayPal and major card options are supported where available." },
			{ icon: ShieldCheck, title: "Protected account flows", copy: "Account password handling is designed around hashed authentication." },
			{ icon: Handshake, title: "Reception coordination", copy: "Reservation support is coordinated with hotel teams instead of unnecessary middlemen." },
		],
		fallbackHtml: {
			guest: `
				<h2>Guest Terms and Conditions</h2>
				<p>These terms explain how reservation requests, hotel availability, pricing, payment options, cancellation handling, and customer support work when using Jannat Booking.</p>
				<h3>Reservation Requests</h3>
				<p>Availability and final confirmation depend on the selected hotel, room type, travel dates, guest details, and payment path. A booking request is not final until the reservation is confirmed through the applicable process.</p>
				<h3>Payments and Security</h3>
				<p>Where online payment is available, Jannat Booking supports secure payment paths such as PayPal and major card options. Private checkout and payment pages are not intended for public indexing.</p>
				<h3>Hotel Coordination</h3>
				<p>Jannat Booking helps guests compare options and coordinates reservation details with hotel reception teams where possible, so guests can travel with clearer expectations.</p>
			`,
			hotel: `
				<h2>Hotel Partner Terms</h2>
				<p>Hotel partners are responsible for sharing accurate availability, pricing, taxes, policies, photos, room information, and operational updates for their listings.</p>
				<h3>Listing Accuracy</h3>
				<p>Hotel information should stay current and clear so guests can compare options with confidence. Any operational changes that affect guest stays should be communicated promptly.</p>
				<h3>Reservation Support</h3>
				<p>Partner hotels are expected to support reservation confirmation, guest communication, and practical service delivery according to the agreed reservation details.</p>
				<h3>Guest Trust</h3>
				<p>Clear policies, transparent pricing, and timely support help protect the guest experience and the trust of the Jannat Booking platform.</p>
			`,
			privacy: `
				<h2>Privacy Policy</h2>
				<p>Jannat Booking uses guest, account, and reservation information to process booking requests, communicate with hotels, support payments, and provide customer service.</p>
				<h3>Information We Use</h3>
				<p>Information may include guest contact details, reservation dates, selected hotels and rooms, payment-support references, support messages, and account details needed to operate the service.</p>
				<h3>Payment and Account Handling</h3>
				<p>Payment flows are handled through supported payment providers and private routes. Account password handling is designed around hashed authentication practices.</p>
				<h3>Private Routes</h3>
				<p>Private checkout, payment, dashboard, reservation, and support-case URLs are intentionally excluded from public indexing where possible.</p>
			`,
		},
	},
	ar: {
		eyebrow: "مركز السياسات",
		title: "سياسات واضحة لحجوزات فندقية أكثر أمانا",
		copy:
			`راجع شروط الضيوف، وتوقعات شركاء الفنادق، وممارسات الخصوصية التي تدعم تجربة ${ARABIC_BRAND_NAME}.`,
		documentLabel: "وثيقة السياسة",
		summaryTitle: "ما الذي تغطيه هذه الصفحة",
		trustTitle: "الثقة والدفع",
		trustCopy:
			`تخدم ${ARABIC_BRAND_NAME} ضيوف حجوزات الفنادق منذ ${FOUNDING_YEAR} من خلال مسارات دفع آمنة، وتنسيق مباشر مع استقبال الفندق، وصفحات سياسات واضحة قبل الحجز.`,
		contactTitle: "تحتاج مساعدة في فهم السياسة؟",
		contactCopy: "يمكن لفريق الدعم توضيح أسئلة الحجز والدفع والإلغاء والخصوصية قبل المتابعة.",
		emailLabel: "البريد الإلكتروني",
		phoneLabel: "الهاتف / واتساب",
		updated: "سياسة عامة موجهة للعملاء",
		viewing: "أنت تقرأ",
		paymentSummary: "دعم PayPal والبطاقات الرئيسية عند توفر خيار الدفع",
		tabs: {
			guest: {
				label: "شروط الضيوف",
				title: "الشروط والأحكام للضيوف",
				kicker: "للمسافرين وضيوف الحجوزات",
				icon: UserCheck,
				summary: [
					"طلبات الحجز، والتوفر، والأسعار، والدفع، والإلغاء، وتوقعات الدعم.",
					"اعتماد التأكيد النهائي على الفندق المختار ونوع الغرفة والتواريخ ومسار الدفع.",
					"طريقة تنسيق جنات بوكينج مع استقبال الفندق كلما أمكن لتوضيح التفاصيل.",
				],
			},
			hotel: {
				label: "شروط شركاء الفنادق",
				title: "شروط شركاء الفنادق",
				kicker: "للفنادق المدرجة أو قيد الانضمام",
				icon: Building2,
				summary: [
					"مسؤولية دقة التوفر والأسعار والضرائب والسياسات والتحديثات التشغيلية.",
					"دور الفندق في تأكيد الحجوزات والتواصل مع الضيوف وتقديم الخدمة.",
					"أهمية أن تبقى بيانات الفندق واضحة وحديثة لبناء الثقة مع الضيوف.",
				],
			},
			privacy: {
				label: "سياسة الخصوصية",
				title: "سياسة الخصوصية",
				kicker: "لبيانات الضيوف والحسابات والحجوزات",
				icon: LockKeyhole,
				summary: [
					"استخدام بيانات الضيوف والحجوزات لمعالجة الطلبات وتقديم الدعم.",
					"التعامل مع بيانات الدفع والحساب والتواصل مع الفنادق وخدمة العملاء.",
					"إبعاد روابط الدفع والحسابات والحجوزات الخاصة عن الفهرسة العامة.",
				],
			},
		},
		trustItems: [
			{ icon: CreditCard, title: "مسارات دفع آمنة", copy: "دعم PayPal والبطاقات الرئيسية عند توفر خيار الدفع." },
			{ icon: ShieldCheck, title: "حماية الحساب", copy: "تتعامل مسارات كلمات المرور مع ممارسات مصممة حول التشفير والهاش." },
			{ icon: Handshake, title: "تنسيق مع الاستقبال", copy: "يتم دعم تفاصيل الحجز مع فرق الفنادق بدلا من الوسطاء غير الضروريين." },
		],
		fallbackHtml: {
			guest: `
				<h2>الشروط والأحكام للضيوف</h2>
				<p>توضح هذه الشروط كيفية عمل طلبات الحجز، وتوفر الفنادق، والأسعار، وخيارات الدفع، وسياسات الإلغاء، وخدمة العملاء عند استخدام جنات بوكينج.</p>
				<h3>طلبات الحجز</h3>
				<p>يعتمد التوفر والتأكيد النهائي على الفندق المختار، ونوع الغرفة، وتواريخ السفر، وبيانات الضيف، ومسار الدفع. لا يعتبر طلب الحجز نهائيا إلا بعد تأكيده من خلال الإجراء المناسب.</p>
				<h3>الدفع والأمان</h3>
				<p>عند توفر الدفع الإلكتروني، تدعم جنات بوكينج مسارات دفع آمنة مثل PayPal وخيارات البطاقات الرئيسية. صفحات الدفع الخاصة ليست مخصصة للفهرسة العامة.</p>
				<h3>التنسيق مع الفندق</h3>
				<p>تساعد جنات بوكينج الضيوف على مقارنة الخيارات وتنسيق تفاصيل الحجز مع استقبال الفندق كلما أمكن، حتى يسافر الضيف بتوقعات أوضح.</p>
			`,
			hotel: `
				<h2>شروط شركاء الفنادق</h2>
				<p>تتحمل الفنادق الشريكة مسؤولية مشاركة معلومات دقيقة عن التوفر، والأسعار، والضرائب، والسياسات، والصور، وأنواع الغرف، والتحديثات التشغيلية.</p>
				<h3>دقة بيانات الفندق</h3>
				<p>يجب أن تبقى معلومات الفندق حديثة وواضحة حتى يستطيع الضيوف مقارنة الخيارات بثقة. يجب مشاركة أي تغييرات تشغيلية تؤثر على إقامة الضيف في الوقت المناسب.</p>
				<h3>دعم الحجوزات</h3>
				<p>يتوقع من الفنادق الشريكة دعم تأكيد الحجوزات، والتواصل مع الضيوف، وتقديم الخدمة العملية حسب تفاصيل الحجز المتفق عليها.</p>
				<h3>ثقة الضيوف</h3>
				<p>السياسات الواضحة، والأسعار الشفافة، والدعم السريع تساعد على حماية تجربة الضيف وثقة منصة جنات بوكينج.</p>
			`,
			privacy: `
				<h2>سياسة الخصوصية</h2>
				<p>تستخدم جنات بوكينج بيانات الضيوف والحسابات والحجوزات لمعالجة طلبات الحجز، والتواصل مع الفنادق، ودعم المدفوعات، وتقديم خدمة العملاء.</p>
				<h3>المعلومات المستخدمة</h3>
				<p>قد تشمل المعلومات بيانات التواصل، وتواريخ الحجز، والفندق والغرف المختارة، ومراجع دعم الدفع، ورسائل الدعم، وبيانات الحساب اللازمة لتشغيل الخدمة.</p>
				<h3>الدفع والحساب</h3>
				<p>تتم مسارات الدفع من خلال مزودي الدفع المدعومين وروابط خاصة. كما أن التعامل مع كلمات المرور مصمم حول ممارسات الهاش.</p>
				<h3>الروابط الخاصة</h3>
				<p>روابط الدفع، والحسابات، والحجوزات، وحالات الدعم الخاصة يتم إبعادها عن الفهرسة العامة قدر الإمكان.</p>
			`,
		},
	},
};

const normalizeLegalHtml = (html = "", language = "en", tab = "guest") => {
	const copy = labels[language] || labels.en;
	const fallback = copy.fallbackHtml[tab] || copy.fallbackHtml.guest;
	const raw = String(html || "").trim() || fallback;
	if (language !== "ar") {
		return raw
			.replace(/more than\s*10,000\s+reservations/gi, "transparent reservation activity")
			.replace(/official@jannatbooking\.com/gi, CONTACT_EMAIL);
	}

	return raw
		.replace(/\bJannat\s+Booking\b/g, ARABIC_BRAND_NAME)
		.replace(/جنة\s+بوك(?:ينج|نج)/g, ARABIC_BRAND_NAME)
		.replace(/حجز\s+جنات/g, ARABIC_BRAND_NAME)
		.replace(/official@jannatbooking\.com/gi, CONTACT_EMAIL);
};

export default function TermsContent({ activeTab = "guest", documents = {} }) {
	const { isArabic, language, hrefWithLanguage } = useJannatApp();
	const currentLanguage = isArabic ? "ar" : "en";
	const copy = labels[currentLanguage];
	const activeKey = tabOrder.includes(activeTab) ? activeTab : "guest";
	const active = copy.tabs[activeKey];
	const ActiveIcon = active.icon || FileText;
	const documentHtml = normalizeLegalHtml(
		currentLanguage === "ar" ? documents[activeKey]?.ar : documents[activeKey]?.en,
		currentLanguage,
		activeKey
	);

	return (
		<section className="section legal-section" dir={isArabic ? "rtl" : "ltr"}>
			<div className="container legal-top-grid">
				<div className="legal-heading">
					<p className="eyebrow">{copy.eyebrow}</p>
					<h2>{copy.title}</h2>
					<p>{copy.copy}</p>
				</div>
				<div className="legal-assurance-strip">
					<span>
						<ShieldCheck size={17} />
						{copy.updated}
					</span>
					<span>
						<CreditCard size={17} />
						{copy.paymentSummary}
					</span>
					<span>
						<BadgeCheck size={17} />
						{isArabic ? ARABIC_BRAND_NAME : BRAND_NAME}
					</span>
				</div>
			</div>

			<div className="container legal-layout">
				<aside className="legal-tabs premium-card" aria-label={isArabic ? "أقسام السياسات" : "Policy sections"}>
					{tabOrder.map((key) => {
						const tab = copy.tabs[key];
						const Icon = tab.icon || FileText;
						return (
							<Link
								key={key}
								className={key === activeKey ? "active" : ""}
								href={hrefWithLanguage(`/terms-conditions?tab=${key}`)}
							>
								<span className="legal-tab-icon" aria-hidden="true">
									<Icon size={18} />
								</span>
								<span>
									<strong>{tab.label}</strong>
									<small>{tab.kicker}</small>
								</span>
							</Link>
						);
					})}
				</aside>

				<article className="legal-document premium-card">
					<header className="legal-document-head">
						<span className="legal-document-icon" aria-hidden="true">
							<ActiveIcon size={26} />
						</span>
						<div>
							<p className="eyebrow">{copy.documentLabel}</p>
							<h1>{active.title}</h1>
							<p>
								{copy.viewing}: <strong>{active.label}</strong>
							</p>
						</div>
					</header>

					<div className="legal-summary-card">
						<h2>{copy.summaryTitle}</h2>
						<ul>
							{active.summary.map((item) => (
								<li key={item}>
									<CheckCircle2 size={17} />
									<span>{item}</span>
								</li>
							))}
						</ul>
					</div>

					<div
						className="legal-html content-prose"
						lang={language}
						dangerouslySetInnerHTML={{ __html: documentHtml }}
					/>
				</article>

				<aside className="trust-panel premium-card">
					<div className="trust-panel-head">
						<span aria-hidden="true">
							<LockKeyhole size={22} />
						</span>
						<div>
							<p className="eyebrow">{copy.trustTitle}</p>
							<h2>{isArabic ? `${ARABIC_BRAND_NAME} منذ ${FOUNDING_YEAR}` : `Secure reservations since ${FOUNDING_YEAR}`}</h2>
						</div>
					</div>
					<p>{copy.trustCopy}</p>
					<div className="trust-feature-list">
						{copy.trustItems.map(({ icon: Icon, title, copy: body }) => (
							<div key={title}>
								<span aria-hidden="true">
									<Icon size={18} />
								</span>
								<strong>{title}</strong>
								<p>{body}</p>
							</div>
						))}
					</div>
					<div className="legal-contact-box">
						<Headset size={20} />
						<h3>{copy.contactTitle}</h3>
						<p>{copy.contactCopy}</p>
						<a {...emailActionProps(CONTACT_EMAIL)}>
							{copy.emailLabel}: <EmailText email={CONTACT_EMAIL} />
						</a>
						<a href="https://wa.me/19092223374" target="_blank" rel="noreferrer">
							{copy.phoneLabel}: <bdi dir="ltr" className="ltr-value">{PHONE_DISPLAY}</bdi>
						</a>
					</div>
				</aside>
			</div>
		</section>
	);
}
