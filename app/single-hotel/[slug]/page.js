import { notFound } from "next/navigation";
import SingleHotelView from "../../../components/SingleHotelView";
import { getHotelBySlug, getWebsite } from "../../../lib/api";
import { BRAND_NAME, DEFAULT_HERO_IMAGE } from "../../../lib/constants";
import { maskWebsiteEmails } from "../../../lib/email";
import { firstImage, titleCase } from "../../../lib/format";

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const hotel = await getHotelBySlug(slug);
	if (!hotel?.hotelName) return { title: "Hotel" };
	const image = firstImage(hotel.hotelPhotos, DEFAULT_HERO_IMAGE);
	return {
		title: titleCase(hotel.hotelName),
		description: `View rooms, location, and booking support for ${titleCase(hotel.hotelName)} with ${BRAND_NAME}.`,
		openGraph: { images: [image] },
	};
}

export default async function SingleHotelPage({ params }) {
	const { slug } = await params;
	const [hotel, website] = await Promise.all([getHotelBySlug(slug), getWebsite()]);
	if (!hotel?.hotelName) notFound();

	return <SingleHotelView hotel={hotel} website={maskWebsiteEmails(website)} />;
}
