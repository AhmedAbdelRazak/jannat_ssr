import PageHero from "../../components/PageHero";
import TermsContent from "../../components/TermsContent";
import { getWebsite } from "../../lib/api";
import { ARABIC_BRAND_NAME, BRAND_NAME, DEFAULT_HERO_IMAGE } from "../../lib/constants";
import { normalizeLanguage } from "../../lib/language";

const arabic = {
	policies: "السياسات",
	privacy: "سياسة الخصوصية",
	hotelTerms: "شروط شركاء الفنادق",
	guestTerms: "الشروط والأحكام للضيوف",
	copy: `شروط حجز واضحة وممارسات خصوصية وتوقعات شركاء الفنادق لتجربة آمنة مع ${ARABIC_BRAND_NAME}.`,
};

const tabConfig = {
	guest: {
		label: "Guest terms",
		labelAr: arabic.guestTerms,
		title: `Guest Terms and Conditions | ${BRAND_NAME}`,
		titleAr: `${arabic.guestTerms} | ${ARABIC_BRAND_NAME}`,
		description:
			"Review Jannat Booking guest terms for Makkah and Madinah hotel reservations, secure payments, cancellation handling, and booking support.",
		descriptionAr:
			`راجع شروط ${ARABIC_BRAND_NAME} للضيوف حول حجوزات فنادق مكة والمدينة، والدفع الآمن، والإلغاء، ودعم الحجز.`,
		field: "termsAndConditionEnglish",
		fieldAr: "termsAndConditionArabic",
	},
	hotel: {
		label: "Hotel partner terms",
		labelAr: arabic.hotelTerms,
		title: `Hotel Partner Terms | ${BRAND_NAME}`,
		titleAr: `${arabic.hotelTerms} | ${ARABIC_BRAND_NAME}`,
		description:
			"Terms for hotels working with Jannat Booking to serve Haj, Umrah, and Saudi city-stay guests.",
		descriptionAr:
			`شروط الفنادق الشريكة مع ${ARABIC_BRAND_NAME} لخدمة ضيوف الحج والعمرة والإقامات داخل السعودية.`,
		field: "termsAndConditionEnglish_B2B",
		fieldAr: "termsAndConditionArabic_B2B",
	},
	privacy: {
		label: "Privacy policy",
		labelAr: arabic.privacy,
		title: `Privacy Policy | ${BRAND_NAME}`,
		titleAr: `${arabic.privacy} | ${ARABIC_BRAND_NAME}`,
		description:
			"Learn how Jannat Booking handles guest reservation data, account security, hotel communication, and payment-support information.",
		descriptionAr:
			`تعرف على طريقة تعامل ${ARABIC_BRAND_NAME} مع بيانات الضيوف والحجوزات والحسابات ودعم الدفع.`,
		field: "privacyPolicy",
		fieldAr: "privacyPolicyArabic",
	},
};

const normalizeTab = (tab) => (tabConfig[tab] ? tab : "guest");

const arabicTitleFor = (tab) => {
	if (tab === "privacy") return arabic.privacy;
	if (tab === "hotel") return arabic.hotelTerms;
	return arabic.guestTerms;
};

export async function generateMetadata({ searchParams }) {
	const params = await searchParams;
	const active = tabConfig[normalizeTab(params?.tab)];
	const isArabic = normalizeLanguage(params?.lang) === "ar";
	const title = isArabic ? active.titleAr : active.title;
	const description = isArabic ? active.descriptionAr : active.description;
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			images: [DEFAULT_HERO_IMAGE],
		},
		alternates: { canonical: `/terms-conditions?tab=${normalizeTab(params?.tab)}` },
	};
}

export default async function TermsConditionsPage({ searchParams }) {
	const params = await searchParams;
	const tab = normalizeTab(params?.tab);
	const active = tabConfig[tab];
	const website = await getWebsite();
	const documents = Object.fromEntries(
		Object.entries(tabConfig).map(([key, item]) => [
			key,
			{
				en: website?.[item.field] || "",
				ar: website?.[item.fieldAr] || "",
			},
		])
	);

	return (
		<>
			<PageHero
				className="legal-hero"
				image={DEFAULT_HERO_IMAGE}
				eyebrow="Policies"
				title={active.label}
				copy="Clear reservation terms, privacy practices, and partner expectations for a secure Jannat Booking experience."
				eyebrowAr={arabic.policies}
				titleAr={arabicTitleFor(tab)}
				copyAr={arabic.copy}
			/>
			<TermsContent activeTab={tab} documents={documents} />
		</>
	);
}
