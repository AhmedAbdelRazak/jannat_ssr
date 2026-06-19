"use client";

import HotelCard from "./HotelCard";
import { useJannatApp } from "./JannatAppProvider";

export default function HotelGrid({ hotels = [], limit, emptyText = "No hotels are available yet." }) {
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
			{rows.map((hotel, index) => (
				<HotelCard key={hotel._id || hotel.hotelName} hotel={hotel} priority={index < 2} />
			))}
		</div>
	);
}
