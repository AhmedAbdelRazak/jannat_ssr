"use client";

import { useEffect, useMemo, useState } from "react";
import { Input, Select } from "antd";
import { Search } from "lucide-react";
import HotelGrid from "./HotelGrid";
import PaginationControls from "./PaginationControls";
import { titleCase, walkingDistance } from "../lib/format";
import {
	hotelDestinationLabel,
	hotelDestinationOptions,
	normalizeHotelDestination,
} from "../lib/hotelLocations";
import CurrencySelector from "./CurrencySelector";
import { useJannatApp } from "./JannatAppProvider";

const parseDistance = (value = "") => {
	const text = String(value || "").toLowerCase();
	let minutes = 0;
	const day = text.match(/(\d+)\s*day/);
	const hour = text.match(/(\d+)\s*hour/);
	const min = text.match(/(\d+)\s*min/);
	if (day) minutes += Number(day[1]) * 1440;
	if (hour) minutes += Number(hour[1]) * 60;
	if (min) minutes += Number(min[1]);
	return minutes || Number.MAX_SAFE_INTEGER;
};

const minPrice = (hotel = {}) => {
	const prices = (hotel.roomCountDetails || [])
		.map((room) => Number(room?.price?.basePrice || 0))
		.filter(Boolean);
	return prices.length ? Math.min(...prices) : Number.MAX_SAFE_INTEGER;
};
const PAGE_SIZE = 15;

export default function HotelExplorer({ hotels = [] }) {
	const { t, isArabic } = useJannatApp();
	const destinations = useMemo(
		() => [{ label: t("all"), value: "All" }, ...hotelDestinationOptions(isArabic)],
		[isArabic, t]
	);
	const [query, setQuery] = useState("");
	const [destination, setDestination] = useState("All");
	const [sort, setSort] = useState("recommended");
	const [page, setPage] = useState(1);

	useEffect(() => {
		setPage(1);
	}, [destination, query, sort]);

	const filtered = useMemo(() => {
		const cleanQuery = query.trim().toLowerCase();
		const cleanDestination = normalizeHotelDestination(destination);
		return [...hotels]
			.filter((hotel) => {
				const hotelDestination =
					normalizeHotelDestination(hotel.hotelCity) ||
					normalizeHotelDestination(hotel.hotelState);
				const haystack = [
					hotel.hotelName,
					hotel.hotelName_OtherLanguage,
					hotel.hotelCity,
					hotel.hotelState,
					hotel.hotelCountry,
					hotel.hotelAddress,
					hotelDestinationLabel(hotelDestination, false),
					hotelDestinationLabel(hotelDestination, true),
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();
				const matchesQuery = !cleanQuery || haystack.includes(cleanQuery);
				const matchesDestination = destination === "All" || hotelDestination === cleanDestination;
				return matchesQuery && matchesDestination;
			})
			.sort((first, second) => {
				if (sort === "price") return minPrice(first) - minPrice(second);
				if (sort === "distance") return parseDistance(walkingDistance(first)) - parseDistance(walkingDistance(second));
				return Number(second.hotelRating || 0) - Number(first.hotelRating || 0);
			});
	}, [destination, hotels, query, sort]);
	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const paginatedHotels = useMemo(
		() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
		[currentPage, filtered]
	);

	return (
		<div className="explorer" dir={isArabic ? "rtl" : "ltr"}>
			<div className="toolbar metallic-panel">
				<div className="search-field">
					<label>{t("hotelSearch")}</label>
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t("hotelNamePlaceholder")}
						prefix={<Search size={16} />}
					/>
				</div>
				<div className="search-field">
					<label>{t("destination")}</label>
					<Select value={destination} options={destinations} onChange={setDestination} />
				</div>
				<div className="search-field">
					<label>{t("sort")}</label>
					<Select
						value={sort}
						onChange={setSort}
						options={[
							{ value: "recommended", label: t("recommended") },
							{ value: "distance", label: t("closest") },
							{ value: "price", label: t("lowestPrice") },
						]}
					/>
				</div>
				<div className="search-field">
					<label>{isArabic ? "\u0627\u0644\u0639\u0645\u0644\u0629" : "Currency"}</label>
					<CurrencySelector className="toolbar-currency-control" />
				</div>
			</div>
			<div className="result-count">
				{filtered.length} {isArabic ? "فنادق" : filtered.length === 1 ? "hotel" : "hotels"}
			</div>
			<HotelGrid hotels={paginatedHotels} emptyText="No Jannat Booking hotels match this filter yet." />
			<PaginationControls
				currentPage={currentPage}
				totalItems={filtered.length}
				pageSize={PAGE_SIZE}
				onPageChange={setPage}
			/>
		</div>
	);
}
