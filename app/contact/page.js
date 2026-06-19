import ContactCards from "../../components/ContactCards";
import ContactForm from "../../components/ContactForm";
import PageHero from "../../components/PageHero";
import { getWebsite } from "../../lib/api";
import {
	ARABIC_BRAND_NAME,
	BRAND_NAME,
	CONTACT_EMAIL,
	DEFAULT_HERO_IMAGE,
	PHONE_DISPLAY,
	WHATSAPP_NUMBER,
} from "../../lib/constants";
import { firstImage } from "../../lib/format";
import { maskEmailForClient } from "../../lib/email";

export const metadata = {
	title: "Contact",
	description: `Contact ${BRAND_NAME} for hotel booking support, payment questions, or reservation updates.`,
	openGraph: { images: [DEFAULT_HERO_IMAGE] },
	alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
	const website = await getWebsite();
	const email = maskEmailForClient(website?.contactEmail || CONTACT_EMAIL);
	const phone = website?.phone || PHONE_DISPLAY;
	const whatsapp = website?.whatsappNumber || WHATSAPP_NUMBER;
	const image = firstImage(website?.contactUsBanner, DEFAULT_HERO_IMAGE);
	return (
		<>
			<PageHero
				image={image}
				eyebrow="Contact"
				title="Talk to Jannat Booking support"
				copy="Ask about availability, room choices, payments, cancellation handling, or an existing reservation."
				eyebrowAr="اتصل بنا"
				titleAr={`تواصل مع دعم ${ARABIC_BRAND_NAME}`}
				copyAr="اسأل عن التوفر أو خيارات الغرف أو الدفع أو طلبات الإلغاء أو حجز قائم."
			/>
			<section className="section">
				<ContactForm />
				<ContactCards email={email} phone={phone} whatsapp={whatsapp} />
			</section>
		</>
	);
}
