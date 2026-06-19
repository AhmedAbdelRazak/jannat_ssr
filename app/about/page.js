import AboutContent from "../../components/AboutContent";
import PageHero from "../../components/PageHero";
import { getWebsite } from "../../lib/api";
import { ARABIC_BRAND_NAME, BRAND_NAME, DEFAULT_HERO_IMAGE, FOUNDING_YEAR } from "../../lib/constants";
import { firstImage, stripHtml } from "../../lib/format";

export async function generateMetadata() {
	const website = await getWebsite();
	const description = stripHtml(website?.aboutUsEnglish).slice(0, 155);
	return {
		title: "About Jannat Booking",
		description:
			description ||
			`${BRAND_NAME} has helped pilgrims and travelers book Makkah and Madinah hotels since ${FOUNDING_YEAR}, with secure payment support and direct hotel coordination.`,
		openGraph: { images: [firstImage(website?.aboutUsBanner, DEFAULT_HERO_IMAGE)] },
		alternates: { canonical: "/about" },
	};
}

export default async function AboutPage() {
	const website = await getWebsite();
	const image = firstImage(website?.aboutUsBanner, DEFAULT_HERO_IMAGE);
	return (
		<>
			<PageHero
				className="about-hero"
				image={image}
				eyebrow="About us"
				title={BRAND_NAME}
				copy={`Trusted Makkah and Madinah hotel reservations since ${FOUNDING_YEAR}, with clear options, secure payments, and responsive support.`}
				eyebrowAr="من نحن"
				titleAr={ARABIC_BRAND_NAME}
				copyAr={`حجوزات فنادق مكة والمدينة منذ ${FOUNDING_YEAR} مع خيارات واضحة ودفع آمن ودعم سريع.`}
			/>
			<AboutContent
				englishHtml={website?.aboutUsEnglish}
				arabicHtml={website?.aboutUsArabic}
			/>
		</>
	);
}
