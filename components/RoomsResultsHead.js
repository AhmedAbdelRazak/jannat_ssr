"use client";

import { titleCase } from "../lib/format";
import { hotelDestinationLabel } from "../lib/hotelLocations";
import CurrencySelector from "./CurrencySelector";
import { useJannatApp } from "./JannatAppProvider";

export default function RoomsResultsHead({ count = 0, destination = "All", startDate, endDate }) {
	const { t, isArabic } = useJannatApp();
	const destinationName =
		destination === "All"
			? t("all")
			: hotelDestinationLabel(destination, isArabic) || titleCase(destination);
	return (
		<div className="results-head" dir={isArabic ? "rtl" : "ltr"}>
			<div>
				<p className="eyebrow">{count} {t("rooms")}</p>
				<h2>{destinationName}</h2>
			</div>
			<div className="results-head-actions">
				<p dir="ltr" className="ltr-value">{startDate} - {endDate}</p>
				<CurrencySelector compact className="results-currency-control" />
			</div>
		</div>
	);
}
