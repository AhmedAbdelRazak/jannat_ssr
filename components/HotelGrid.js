"use client";

import HotelCard from "./HotelCard";
import { useJannatApp } from "./JannatAppProvider";

export default function HotelGrid({
	hotels = [],
	limit,
	emptyText = "No hotels are available yet.",
	optimizeImages = false,
}) {
	const { isArabic } = useJannatApp();
	const rows = Array.isArray(hotels) ? hotels.slice(0, limit || hotels.length) : [];
	if (!rows.length) {
		return (
			<div className="empty-state" dir={isArabic ? "rtl" : "ltr"}>
				{isArabic ? "لا توجد فنادق متاحة حاليا." : emptyText}
			</div>
		);
	}
	return (
		<div className="hotel-grid">
			{rows.map((hotel) => (
				<HotelCard
					key={hotel._id || hotel.hotelName}
					hotel={hotel}
					optimizeImages={optimizeImages}
				/>
			))}
		</div>
	);
}
