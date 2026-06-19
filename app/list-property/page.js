import ListPropertyClient from "../../components/ListPropertyClient";
import PageHero from "../../components/PageHero";
import { BRAND_NAME, DEFAULT_HERO_IMAGE } from "../../lib/constants";

export const metadata = {
	title: `List Your Property | ${BRAND_NAME}`,
	description:
		"List your Makkah or Madinah hotel with Jannat Booking and reach Haj, Umrah, and Saudi city-stay travelers through a trusted reservation platform.",
	openGraph: { images: [DEFAULT_HERO_IMAGE] },
	alternates: { canonical: "/list-property" },
};

export default function ListPropertyPage() {
	return (
		<>
			<PageHero
				image={DEFAULT_HERO_IMAGE}
				eyebrow="Partner hotels"
				title="List your property"
				copy="Join a hotel reservation platform serving pilgrims and travelers with clear pricing, responsive support, and direct hotel coordination."
				eyebrowAr={"\u0627\u0644\u0641\u0646\u0627\u062f\u0642 \u0627\u0644\u0634\u0631\u064a\u0643\u0629"}
				titleAr={"\u0623\u0636\u0641 \u0641\u0646\u062f\u0642\u0643"}
				copyAr={"\u0627\u0646\u0636\u0645 \u0625\u0644\u0649 \u0645\u0646\u0635\u0629 \u062d\u062c\u0648\u0632\u0627\u062a \u062a\u062e\u062f\u0645 \u0627\u0644\u062d\u062c\u0627\u062c \u0648\u0627\u0644\u0645\u0639\u062a\u0645\u0631\u064a\u0646 \u0648\u0627\u0644\u0645\u0633\u0627\u0641\u0631\u064a\u0646 \u0628\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0636\u062d\u0629 \u0648\u062f\u0639\u0645 \u0633\u0631\u064a\u0639 \u0648\u062a\u0646\u0633\u064a\u0642 \u0645\u0628\u0627\u0634\u0631 \u0645\u0639 \u0627\u0644\u0641\u0646\u062f\u0642."}
			/>
			<section className="section">
				<div className="container">
					<ListPropertyClient />
				</div>
			</section>
		</>
	);
}
