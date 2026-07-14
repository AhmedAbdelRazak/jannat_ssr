import HeroCarousel from "../components/HeroCarousel";
import HomeSections from "../components/HomeSections";
import SearchPanel from "../components/SearchPanel";
import { getFeaturedHotels, getHotels, getRoomTypes, getWebsite } from "../lib/api";
import { DEFAULT_HERO_IMAGE } from "../lib/constants";
import { maskWebsiteEmails } from "../lib/email";
import { compactHotelForCard } from "../lib/hotelCardData.mjs";

export const dynamic = "force-dynamic";

export default async function HomePage() {
	const [website, hotels, featuredHotels, roomTypes] = await Promise.all([
		getWebsite(),
		getHotels({ freshRatings: true }),
		getFeaturedHotels({ freshRatings: true }),
		getRoomTypes(),
	]);
	const clientWebsite = maskWebsiteEmails({
		homeMainBanners: website?.homeMainBanners || [],
		homeSecondBanner: website?.homeSecondBanner || {},
		homeThirdBanner: website?.homeThirdBanner || {},
	});
	const homeHotels = (featuredHotels.length ? featuredHotels : hotels)
		.slice(0, 6)
		.map((hotel) => compactHotelForCard(hotel, DEFAULT_HERO_IMAGE));
	const homeRoomTypes = roomTypes.map((room) => ({
		roomType: room?.roomType,
		displayName: room?.displayName,
	}));

	return (
		<>
			<HeroCarousel website={clientWebsite} />
			<section className="search-band">
				<div className="container">
					<SearchPanel roomTypes={homeRoomTypes} />
				</div>
			</section>
			<HomeSections
				website={clientWebsite}
				hotels={homeHotels}
			/>
		</>
	);
}
