import HeroCarousel from "../components/HeroCarousel";
import HomeSections from "../components/HomeSections";
import SearchPanel from "../components/SearchPanel";
import { getFeaturedHotels, getHotels, getRoomTypes, getWebsite } from "../lib/api";
import { maskWebsiteEmails } from "../lib/email";
import { stripHtml } from "../lib/format";

export default async function HomePage() {
	const [website, hotels, featuredHotels, roomTypes] = await Promise.all([
		getWebsite(),
		getHotels(),
		getFeaturedHotels(),
		getRoomTypes(),
	]);
	const aboutCopy = stripHtml(website?.aboutUsEnglish)
		.replace(/^Jannat Booking\s+Jannat Booking\b/i, "Jannat Booking")
		.slice(0, 260);
	const clientWebsite = maskWebsiteEmails(website);

	return (
		<>
			<HeroCarousel website={clientWebsite} />
			<section className="search-band">
				<div className="container">
					<SearchPanel hotels={hotels} roomTypes={roomTypes} />
				</div>
			</section>
			<HomeSections
				website={clientWebsite}
				hotels={hotels}
				featuredHotels={featuredHotels}
				aboutCopy={aboutCopy}
			/>
		</>
	);
}
