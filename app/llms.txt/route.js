import { getHotels } from "../../lib/api";
import {
	BRAND_NAME,
	BRAND_URL,
	CONTACT_EMAIL,
	FOUNDING_YEAR,
	PAYMENT_METHODS,
} from "../../lib/constants";
import { slugifyHotel, titleCase } from "../../lib/format";

export async function GET() {
	const hotels = await getHotels();
	const hotelLines = hotels
		.slice(0, 30)
		.map((hotel) => `- ${titleCase(hotel.hotelName)}: ${BRAND_URL}/single-hotel/${slugifyHotel(hotel.hotelName)}`)
		.join("\n");

	const body = `# ${BRAND_NAME}

${BRAND_NAME} helps pilgrims and travelers book selected, affordable hotels in Makkah and Madinah for Umrah, Haj, and city stays. The platform has served hotel reservation guests since ${FOUNDING_YEAR}, supports hotel comparison by date range, room type, pricing, and distance to Al Haram, and displays reservation activity transparently from the system.

Trust and booking model:
- Jannat Booking coordinates reservation requests directly with hotel reception teams where possible, avoiding unnecessary agent or middleman layers.
- Guests can review public terms, hotel partner terms, and the privacy policy before booking.
- Secure payment support includes ${PAYMENT_METHODS.join(", ")}.
- Account password flows are designed around hashed authentication handling. Public receipt endpoints are sanitized and do not expose card data or account credentials.
- Private checkout, payment, dashboard, reservation, and support-case URLs are intentionally excluded from indexing.

Primary public pages:
- Home: ${BRAND_URL}/
- Hotels: ${BRAND_URL}/our-hotels
- Room search: ${BRAND_URL}/rooms
- Offers: ${BRAND_URL}/jannat-offers-monthly-reservations
- About: ${BRAND_URL}/about
- Contact: ${BRAND_URL}/contact
- Guest terms: ${BRAND_URL}/terms-conditions?tab=guest
- Hotel partner terms: ${BRAND_URL}/terms-conditions?tab=hotel
- Privacy policy: ${BRAND_URL}/terms-conditions?tab=privacy
- List a property: ${BRAND_URL}/list-property

Representative hotel pages:
${hotelLines || "- Active hotel pages are listed in the XML sitemap."}

Support:
- Use the on-page support widget, WhatsApp, phone, or ${CONTACT_EMAIL} for booking, availability, payment, reservation update, and human-handled cancellation questions.

Privacy:
- Reservation details, payment links, checkout states, dashboards, and chat transcripts are private and are not intended for indexing or LLM ingestion.
`;

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600, s-maxage=3600",
		},
	});
}
