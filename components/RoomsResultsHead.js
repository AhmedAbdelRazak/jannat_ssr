"use client";

import { BedDouble, CalendarDays, Hotel, Moon } from "lucide-react";
import { titleCase } from "../lib/format";
import { hotelDestinationLabel } from "../lib/hotelLocations";
import CurrencySelector from "./CurrencySelector";
import { useJannatApp } from "./JannatAppProvider";

export default function RoomsResultsHead({
	count = 0,
	hotelCount = 0,
	showingCount = 0,
	destination = "All",
	startDate,
	endDate,
	nights = 1,
}) {
	const { t, isArabic } = useJannatApp();
	const destinationName =
		destination === "All"
			? t("all")
			: hotelDestinationLabel(destination, isArabic) || titleCase(destination);
	const labels = isArabic
		? {
				eyebrow: "\u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u063a\u0631\u0641 \u0627\u0644\u0645\u062a\u0627\u062d\u0629",
				copy: "\u0642\u0627\u0631\u0646 \u0627\u0644\u063a\u0631\u0641 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u0645\u0648\u0642\u0639 \u0642\u0628\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062e\u064a\u0627\u0631 \u0627\u0644\u0623\u0646\u0633\u0628 \u0644\u0633\u0644\u0629 \u0627\u0644\u062d\u062c\u0632.",
				rooms: "\u063a\u0631\u0641",
				hotels: "\u0641\u0646\u0627\u062f\u0642",
				showing: "\u0645\u0639\u0631\u0648\u0636",
			}
		: {
				eyebrow: "Available room options",
				copy: "Compare rooms, rates, location, and booking actions before adding the best fit to your cart.",
				rooms: "rooms",
				hotels: "hotels",
				showing: "showing",
			};
	return (
		<div className="results-head" dir={isArabic ? "rtl" : "ltr"}>
			<div className="results-head-copy">
				<p className="eyebrow">{labels.eyebrow}</p>
				<h2>{destinationName}</h2>
				<p>{labels.copy}</p>
				<div className="results-stat-row">
					<span>
						<BedDouble size={15} />
						<bdi dir="ltr" className="ltr-value">{count}</bdi> {labels.rooms}
					</span>
					{hotelCount ? (
						<span>
							<Hotel size={15} />
							<bdi dir="ltr" className="ltr-value">{hotelCount}</bdi> {labels.hotels}
						</span>
					) : null}
					<span>
						<Moon size={15} />
						<bdi dir="ltr" className="ltr-value">{nights}</bdi> {nights > 1 ? t("nights") : t("night")}
					</span>
					{showingCount ? (
						<span>
							<BedDouble size={15} />
							<bdi dir="ltr" className="ltr-value">{showingCount}</bdi> {labels.showing}
						</span>
					) : null}
				</div>
			</div>
			<div className="results-head-actions">
				<p className="results-date-pill">
					<CalendarDays size={15} />
					<bdi dir="ltr" className="ltr-value">{startDate} - {endDate}</bdi>
				</p>
				<CurrencySelector compact className="results-currency-control" />
			</div>
		</div>
	);
}
