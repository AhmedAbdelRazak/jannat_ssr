"use client";

import { useEffect } from "react";
import { Coins } from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import { currencyFromSearch, currencyOptions as buildCurrencyOptions } from "../lib/currency";
import { useJannatApp } from "./JannatAppProvider";

export default function CurrencySelector({ className = "", compact = false }) {
	const { currency, setCurrency, isArabic, language } = useJannatApp();
	const options = buildCurrencyOptions(language, !compact);
	const label = isArabic ? "\u0627\u0644\u0639\u0645\u0644\u0629" : "Currency";

	useEffect(() => {
		const urlCurrency = currencyFromSearch(window.location.search);
		if (urlCurrency && urlCurrency !== currency) setCurrency(urlCurrency);
	}, [currency, setCurrency]);

	const handleChange = (event) => {
		const nextCurrency = event.target.value;
		setCurrency(nextCurrency);
		trackConversion(
			"currencyChange",
			{ currency: nextCurrency.toUpperCase(), content_name: "Currency selector" },
			["CurrencyChanged_OurHotels", "Currency Changed"]
		);
	};

	return (
		<label
			className={`currency-control ${compact ? "compact" : ""} ${className}`.trim()}
			title={label}
			aria-label={label}
			dir={isArabic ? "rtl" : "ltr"}
		>
			<span className="currency-icon" aria-hidden="true">
				<Coins size={15} />
			</span>
			<span className="sr-only">{label}</span>
			<select value={currency} onChange={handleChange} aria-label={label}>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</label>
	);
}
