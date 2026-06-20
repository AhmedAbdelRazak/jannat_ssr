"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, CalendarDays, Search, Users } from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import { roomTypeLabel } from "../lib/format";
import { hotelDestinationOptions, normalizeHotelDestination } from "../lib/hotelLocations";
import { useJannatApp } from "./JannatAppProvider";

const DEFAULT_SEARCH_DESTINATION = "Makkah";
const padDate = (value) => String(value).padStart(2, "0");
const formatDate = (date) =>
	`${date.getFullYear()}-${padDate(date.getMonth() + 1)}-${padDate(date.getDate())}`;
const dateOffset = (days) => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return formatDate(date);
};
const isDateValue = (value = "") => /^\d{4}-\d{2}-\d{2}$/.test(String(value));
const parseDate = (value, fallbackDays) => (isDateValue(value) ? value : dateOffset(fallbackDays));
const addDays = (value, days) => {
	const date = new Date(`${parseDate(value, 1)}T00:00:00`);
	date.setDate(date.getDate() + days);
	return formatDate(date);
};
export default function SearchPanel({ hotels = [], roomTypes = [], compact = false, defaults = {} }) {
	const router = useRouter();
	const { t, isArabic, language, currency } = useJannatApp();
	const fieldId = useId();
	const labels = {
		heading: isArabic
			? "\u062f\u0639\u0646\u0627 \u0646\u0633\u0627\u0639\u062f\u0643 \u0641\u064a \u0625\u064a\u062c\u0627\u062f \u0645\u0627 \u062a\u062d\u062a\u0627\u062c\u0647"
			: "Let us help you find what you need",
		city: isArabic ? "\u0627\u0644\u0645\u062f\u064a\u0646\u0629" : "CITY",
		from: isArabic ? "\u0645\u0646" : "FROM",
		to: isArabic ? "\u0625\u0644\u0649" : "TO",
		guests: isArabic ? "\u0627\u0644\u0636\u064a\u0648\u0641" : "GUESTS",
		selectDestination: isArabic
			? "إلى أين ترغب في الذهاب؟"
			: "Where would you like to go?",
		children: isArabic ? "الأطفال" : "CHILDREN",
		destinationRequired: isArabic ? "اختر الوجهة أولا" : "Choose a destination first",
	};

	const destinations = useMemo(() => hotelDestinationOptions(isArabic), [isArabic]);
	const defaultDestination = useMemo(() => {
		const normalizedDefault = normalizeHotelDestination(defaults.destination);
		return normalizedDefault || DEFAULT_SEARCH_DESTINATION;
	}, [defaults.destination]);
	const defaultCheckIn = useMemo(() => parseDate(defaults.startDate, 1), [defaults.startDate]);
	const defaultCheckOut = useMemo(() => {
		const start = parseDate(defaults.startDate, 1);
		const end = parseDate(defaults.endDate, 7);
		return end > start ? end : addDays(start, 1);
	}, [defaults.endDate, defaults.startDate]);
	const defaultRoomType = defaults.roomType || "all";
	const defaultAdults = Number(defaults.adults || 1);
	const defaultChildren = Number(defaults.children || 0);

	const [destination, setDestination] = useState(defaultDestination);
	const [checkIn, setCheckIn] = useState(defaultCheckIn);
	const [checkOut, setCheckOut] = useState(defaultCheckOut);
	const [roomType, setRoomType] = useState(defaultRoomType);
	const [adults, setAdults] = useState(defaultAdults);
	const [children, setChildren] = useState(defaultChildren);
	const [submitted, setSubmitted] = useState(false);

	useEffect(() => {
		setDestination(defaultDestination);
		setCheckIn(defaultCheckIn);
		setCheckOut(defaultCheckOut);
		setRoomType(defaultRoomType);
		setAdults(defaultAdults);
		setChildren(defaultChildren);
		setSubmitted(false);
	}, [
		defaultAdults,
		defaultCheckIn,
		defaultCheckOut,
		defaultChildren,
		defaultDestination,
		defaultRoomType,
	]);

	const handleCheckInChange = (event) => {
		const nextCheckIn = parseDate(event.target.value, 1);
		setCheckIn(nextCheckIn);
		setCheckOut((current) => (current > nextCheckIn ? current : addDays(nextCheckIn, 1)));
	};

	const handleCheckOutChange = (event) => {
		const minCheckout = addDays(checkIn, 1);
		const value = parseDate(event.target.value, 4);
		setCheckOut(value > checkIn ? value : minCheckout);
	};

	const submit = (event) => {
		event.preventDefault();
		setSubmitted(true);
		const cleanDestination = normalizeHotelDestination(destination);
		if (!cleanDestination) return;
		const startDate = parseDate(checkIn, 1);
		const endDate = checkOut > checkIn ? checkOut : addDays(checkIn, 1);
		const params = new URLSearchParams({
			destination: cleanDestination,
			startDate,
			endDate,
			roomType,
			adults: String(adults || 1),
			children: String(children || 0),
			lang: language,
			currency,
		});
		trackConversion(
			"search",
			{
				search_term: cleanDestination,
				destination: cleanDestination,
				start_date: startDate,
				end_date: endDate,
				room_type: roomType,
				adults: String(adults || 1),
				children: String(children || 0),
			},
			["Hotel Search", "Search Submitted", "Search Submitted From Home Page Page"]
		);
		router.push(`/rooms?${params.toString()}`);
	};

	const roomOptions = useMemo(() => {
		const options = [{ label: t("allRooms"), value: "all" }];
		const seen = new Set(["all"]);
		roomTypes.forEach((room) => {
			const value = room.roomType || room.displayName;
			if (!value || seen.has(value)) return;
			seen.add(value);
			options.push({
				label: room.displayName || roomTypeLabel(room.roomType),
				value,
			});
		});
		return options;
	}, [roomTypes, t]);

	return (
		<form className={`search-panel ${compact ? "compact" : ""}`} onSubmit={submit} dir={isArabic ? "rtl" : "ltr"}>
			<h2 className="search-panel-heading">{labels.heading}</h2>
			<div className="search-panel-row">
				<div className={`search-field destination-field ${submitted && !destination ? "is-invalid" : ""}`}>
					<label htmlFor={`${fieldId}-destination`}>{labels.city}</label>
					<select
						id={`${fieldId}-destination`}
						className="search-control native-select"
						value={destination}
						onChange={(event) => setDestination(normalizeHotelDestination(event.target.value))}
						aria-label={labels.selectDestination}
						aria-invalid={submitted && !destination ? "true" : "false"}
					>
						<option value="">{labels.selectDestination}</option>
						{destinations.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					{submitted && !destination ? <small>{labels.destinationRequired}</small> : null}
				</div>
				<div className="search-field">
					<label htmlFor={`${fieldId}-check-in`}>{labels.from}</label>
					<div className="search-control date-native-control">
						<CalendarDays size={16} />
						<bdi dir="ltr">{checkIn}</bdi>
						<input
							id={`${fieldId}-check-in`}
							type="date"
							value={checkIn}
							min={dateOffset(0)}
							onChange={handleCheckInChange}
							aria-label={labels.from}
						/>
					</div>
				</div>
				<div className="search-field">
					<label htmlFor={`${fieldId}-check-out`}>{labels.to}</label>
					<div className="search-control date-native-control">
						<CalendarDays size={16} />
						<bdi dir="ltr">{checkOut}</bdi>
						<input
							id={`${fieldId}-check-out`}
							type="date"
							value={checkOut}
							min={addDays(checkIn, 1)}
							onChange={handleCheckOutChange}
							aria-label={labels.to}
						/>
					</div>
				</div>
			</div>
			<div className="search-panel-row">
				<div className="search-field">
					<label htmlFor={`${fieldId}-room-type`}>{t("roomType")}</label>
					<select
						id={`${fieldId}-room-type`}
						className="search-control native-select"
						value={roomType}
						onChange={(event) => setRoomType(event.target.value)}
						aria-label={t("roomType")}
					>
						{roomOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>
				<div className="search-field">
					<label htmlFor={`${fieldId}-guests`}>{labels.guests}</label>
					<div className="search-control guest-native-control">
						<Users size={15} />
						<input
							id={`${fieldId}-guests`}
							type="number"
							min="1"
							max="20"
							value={adults}
							onChange={(event) => setAdults(Number(event.target.value || 1))}
							dir="ltr"
							aria-label={labels.guests}
						/>
					</div>
				</div>
				<div className="search-field">
					<label htmlFor={`${fieldId}-children`}>{labels.children}</label>
					<div className="search-control guest-native-control">
						<Baby size={15} />
						<input
							id={`${fieldId}-children`}
							type="number"
							min="0"
							max="20"
							value={children}
							onChange={(event) => setChildren(Number(event.target.value || 0))}
							dir="ltr"
							aria-label={labels.children}
						/>
					</div>
				</div>
				<div className="search-submit-wrap">
					<button type="submit" className="search-submit">
						<Search size={18} />
						{t("search")}
					</button>
				</div>
			</div>
		</form>
	);
}
