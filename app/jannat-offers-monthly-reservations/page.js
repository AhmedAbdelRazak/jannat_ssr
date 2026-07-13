import { DealsShowcase } from "../../components/HotelDealsSection";
import PageHero from "../../components/PageHero";
import { getDealHotels } from "../../lib/api";
import { BRAND_NAME, DEFAULT_HERO_IMAGE } from "../../lib/constants";
import { upcomingDealHotelsOnly } from "../../lib/deals";

export const metadata = {
	title: "Offers",
	description: `Monthly and special hotel offers from ${BRAND_NAME}.`,
	openGraph: { images: [DEFAULT_HERO_IMAGE] },
	alternates: { canonical: "/jannat-offers-monthly-reservations" },
};

export const dynamic = "force-dynamic";

export default async function OffersPage() {
	const hotels = await getDealHotels({ fresh: true });
	const upcomingHotels = upcomingDealHotelsOnly(hotels);
	return (
		<>
			<PageHero
				eyebrow="Offers"
				title="Monthly and special stays"
				copy="Hotels with active monthly pricing or special room offers appear here when available."
				eyebrowAr="العروض"
				titleAr="إقامات شهرية وعروض خاصة"
				copyAr="تظهر هنا الفنادق التي لديها أسعار شهرية أو عروض غرف نشطة."
			/>
			<DealsShowcase hotels={upcomingHotels} />
		</>
	);
}
