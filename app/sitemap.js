import { getDealHotels, getHotels } from "../lib/api";
import { BRAND_URL } from "../lib/constants";
import { slugifyHotel } from "../lib/format";

const publicRoutes = [
	"",
	"/our-hotels",
	"/rooms",
	"/about",
	"/contact",
	"/terms-conditions?tab=guest",
	"/terms-conditions?tab=hotel",
	"/terms-conditions?tab=privacy",
	"/list-property",
];

export default async function sitemap() {
	const now = new Date();
	const [hotels, dealHotels] = await Promise.all([getHotels(), getDealHotels()]);
	const routes = Array.isArray(dealHotels) && dealHotels.length
		? [...publicRoutes.slice(0, 3), "/jannat-offers-monthly-reservations", ...publicRoutes.slice(3)]
		: publicRoutes;
	const staticEntries = routes.map((route) => ({
		url: `${BRAND_URL}${route}`,
		lastModified: now,
		changeFrequency: route === "" || route === "/our-hotels" ? "daily" : "weekly",
		priority: route === "" ? 1 : 0.75,
	}));
	const hotelEntries = hotels
		.filter((hotel) => hotel?.hotelName)
		.map((hotel) => ({
			url: `${BRAND_URL}/single-hotel/${slugifyHotel(hotel.hotelName)}`,
			lastModified: now,
			changeFrequency: "daily",
			priority: 0.82,
		}));

	return [...staticEntries, ...hotelEntries];
}
