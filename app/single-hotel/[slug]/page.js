import { cache } from "react";
import { notFound } from "next/navigation";
import SingleHotelView from "../../../components/SingleHotelView";
import { getHotelBySlug, getHotelReviewsBySlug, getWebsite } from "../../../lib/api";
import { BRAND_NAME, BRAND_URL, DEFAULT_HERO_IMAGE } from "../../../lib/constants";
import { maskWebsiteEmails } from "../../../lib/email";
import { withUpcomingDealsOnly } from "../../../lib/deals";
import { firstImage, hotelLocation, titleCase } from "../../../lib/format";
import {
	HOTEL_REVIEW_PAGE_SIZE,
	normalizeHotelReviewPage,
} from "../../../lib/hotelReviews";

const initialHotelReviews = cache(async (slug) => {
	const payload = await getHotelReviewsBySlug(slug, {
		page: 1,
		limit: HOTEL_REVIEW_PAGE_SIZE,
		cache: "no-store",
	});
	return normalizeHotelReviewPage(payload, HOTEL_REVIEW_PAGE_SIZE);
});

const canonicalHotelPath = (slug) =>
	`/single-hotel/${encodeURIComponent(String(slug || "").trim())}`;

const validReviewDate = (value) => {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

const hotelJsonLd = ({ hotel, slug, reviewsData }) => {
	const canonicalPath = canonicalHotelPath(slug);
	const canonicalUrl = new URL(canonicalPath, BRAND_URL).toString();
	const name = titleCase(hotel.hotelName);
	const image = firstImage(hotel.hotelPhotos, DEFAULT_HERO_IMAGE);
	const summary = reviewsData.summary;
	const hasRealRating = summary.ratingCount > 0;
	const publicReviews = hasRealRating
		? reviewsData.reviews
				.map((review) => {
					const rawRating = Number(review?.rating);
					if (!Number.isFinite(rawRating) || rawRating < 1 || rawRating > 5) return null;
					const rating = Math.min(5, Math.max(1, rawRating));
					const authorName = String(review?.displayName || "").trim();
					if (!authorName) return null;
					return {
						"@type": "Review",
						author: { "@type": "Person", name: authorName.slice(0, 100) },
						...(review.comment
							? { reviewBody: String(review.comment).trim().slice(0, 4000) }
							: {}),
						...(validReviewDate(review.createdAt)
							? { datePublished: validReviewDate(review.createdAt) }
							: {}),
						reviewRating: {
							"@type": "Rating",
							ratingValue: rating,
							bestRating: 5,
							worstRating: 1,
						},
					};
				})
				.filter(Boolean)
		: [];

	return {
		"@context": "https://schema.org",
		"@type": "Hotel",
		"@id": `${canonicalUrl}#hotel`,
		name,
		url: canonicalUrl,
		image,
		...(hotel.hotelAddress || hotelLocation(hotel)
			? {
					address: {
						"@type": "PostalAddress",
						streetAddress: hotel.hotelAddress || undefined,
						addressLocality: hotel.hotelCity || undefined,
						addressRegion: hotel.hotelState || undefined,
						addressCountry: hotel.hotelCountry || "Saudi Arabia",
					},
			  }
			: {}),
		...(hotel.phone ? { telephone: hotel.phone } : {}),
		...(hasRealRating
			? {
					aggregateRating: {
						"@type": "AggregateRating",
						ratingValue: Number(summary.averageRating.toFixed(2)),
						ratingCount: summary.ratingCount,
						bestRating: 5,
						worstRating: 1,
					},
			  }
			: {}),
		...(publicReviews.length ? { review: publicReviews } : {}),
	};
};

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const [hotel, reviewsData] = await Promise.all([
		getHotelBySlug(slug),
		initialHotelReviews(slug),
	]);
	if (!hotel?.hotelName) return { title: "Hotel" };
	const image = firstImage(hotel.hotelPhotos, DEFAULT_HERO_IMAGE);
	const name = titleCase(hotel.hotelName);
	const canonical = canonicalHotelPath(slug);
	const hasRealRating = reviewsData.summary.ratingCount > 0;
	const ratingDescription = hasRealRating
		? ` Guest rated ${reviewsData.summary.averageRating.toFixed(1)} out of 5 from ${reviewsData.summary.ratingCount} ${reviewsData.summary.ratingCount === 1 ? "rating" : "ratings"}.`
		: "";
	const description = `View rooms, location, and booking support for ${name} with ${BRAND_NAME}.${ratingDescription}`;
	return {
		title: name,
		description,
		alternates: {
			canonical,
			languages: {
				en: `${canonical}?lang=en`,
				ar: `${canonical}?lang=ar`,
			},
		},
		openGraph: {
			type: "website",
			url: canonical,
			title: `${name} | ${BRAND_NAME}`,
			description,
			images: [image],
		},
		twitter: {
			card: "summary_large_image",
			title: `${name} | ${BRAND_NAME}`,
			description,
			images: [image],
		},
	};
}

export default async function SingleHotelPage({ params }) {
	const { slug } = await params;
	const [hotel, website, reviewsData] = await Promise.all([
		getHotelBySlug(slug),
		getWebsite(),
		initialHotelReviews(slug),
	]);
	if (!hotel?.hotelName) notFound();
	const publicHotel = withUpcomingDealsOnly(hotel);
	const structuredData = hotelJsonLd({ hotel: publicHotel, slug, reviewsData });
	const clientWebsite = maskWebsiteEmails({
		phone: website?.phone,
		whatsappNumber: website?.whatsappNumber,
	});

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
				}}
			/>
			<SingleHotelView
				hotel={publicHotel}
				hotelSlug={slug}
				website={clientWebsite}
				initialReviewsData={reviewsData}
			/>
		</>
	);
}
