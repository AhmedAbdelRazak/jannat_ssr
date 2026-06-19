import HotelExplorer from "../../components/HotelExplorer";
import PageHero from "../../components/PageHero";
import SearchPanel from "../../components/SearchPanel";
import { getHotels, getRoomTypes } from "../../lib/api";
import { ARABIC_BRAND_NAME, BRAND_NAME, DEFAULT_HERO_IMAGE } from "../../lib/constants";

export const metadata = {
	title: "Our Hotels",
	description: `Browse the ${BRAND_NAME} hotel collection in Makkah and Madinah.`,
	openGraph: { images: [DEFAULT_HERO_IMAGE] },
	alternates: { canonical: "/our-hotels" },
};

export default async function OurHotelsPage() {
	const [hotels, roomTypes] = await Promise.all([getHotels(), getRoomTypes()]);
	return (
		<>
			<PageHero
				eyebrow="Jannat Booking"
				title="Our hotel collection"
				copy="Browse selected Jannat Booking hotels, compare locations, and choose the room type that fits your trip."
				eyebrowAr={ARABIC_BRAND_NAME}
				titleAr="مجموعة فنادقنا"
				copyAr={`تصفح فنادق ${ARABIC_BRAND_NAME}، قارن المواقع، واختر نوع الغرفة الأنسب لرحلتك.`}
			/>
			<section className="search-band page-search-band">
				<div className="container">
					<SearchPanel hotels={hotels} roomTypes={roomTypes} compact />
				</div>
			</section>
			<section className="section">
				<div className="container page-stack">
					<HotelExplorer hotels={hotels} />
				</div>
			</section>
		</>
	);
}
