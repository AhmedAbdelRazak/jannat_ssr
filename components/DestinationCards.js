"use client";

import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import { HOTEL_DESTINATIONS } from "../lib/hotelLocations";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const padDate = (value) => String(value).padStart(2, "0");
const formatDate = (date) =>
	`${date.getFullYear()}-${padDate(date.getMonth() + 1)}-${padDate(date.getDate())}`;
const dateOffset = (days) => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return formatDate(date);
};

const destinationDetails = {
	Makkah: {
		image: "/destinations/makkah.png",
		copy: {
			en: "Hotels near Al Haram with clear room choices.",
			ar: "فنادق قريبة من الحرم مع خيارات غرف واضحة.",
		},
	},
	Madinah: {
		image: "/destinations/madinah.png",
		copy: {
			en: "Comfortable stays for visiting Al Madinah.",
			ar: "إقامات مريحة لزيارة المدينة المنورة.",
		},
	},
};

const destinations = HOTEL_DESTINATIONS.map((destination) => ({
	...destination,
	...destinationDetails[destination.value],
}));

export default function DestinationCards() {
	const { isArabic, hrefWithLanguage } = useJannatApp();
	const startDate = dateOffset(1);
	const endDate = dateOffset(7);

	const destinationHref = (destination) => {
		const params = new URLSearchParams({ destination });
		return hrefWithLanguage(`/our-hotels?${params.toString()}`);
	};

	const trackDestination = (destination) => {
		trackConversion(
			"search",
			{
				search_term: destination,
				destination,
				start_date: startDate,
				end_date: endDate,
				room_type: "all",
				adults: "1",
				children: "0",
			},
			[`User Clicked on ${destination} From Home Page`, "DestinationClick"]
		);
	};

	return (
		<section className="section destination-section" dir={isArabic ? "rtl" : "ltr"}>
			<div className="container">
				<div className="section-head">
					<div>
						<p className="eyebrow">{isArabic ? "وجهات مختارة" : "Selected destinations"}</p>
						<h2 className="section-title">{isArabic ? "أفضل الوجهات" : "Top destinations"}</h2>
					</div>
				</div>
				<div className="destination-grid">
					{destinations.map((destination) => (
						<Link
							key={destination.value}
							className="destination-card premium-card"
							href={destinationHref(destination.value)}
							onClick={() => trackDestination(destination.value)}
						>
							<span className="destination-card-image">
								<OptimizedImage
									src={destination.image}
									alt={destination.label[isArabic ? "ar" : "en"]}
									width={180}
									height={140}
									sizes="(max-width: 760px) 96px, 180px"
								/>
							</span>
							<span className="destination-card-copy">
								<span>
									<MapPinned size={17} />
									{destination.label[isArabic ? "ar" : "en"]}
								</span>
								<small>{destination.copy[isArabic ? "ar" : "en"]}</small>
							</span>
							<ArrowRight className="destination-card-arrow" size={18} />
						</Link>
					))}
				</div>
			</div>
		</section>
	);
}
