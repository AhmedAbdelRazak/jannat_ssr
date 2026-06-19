export const CURRENCY_QUERY_PARAM = "currency";

export const DEFAULT_CURRENCY = "sar";

export const DEFAULT_CURRENCY_RATES = {
	SAR_USD: 0.27,
	SAR_EUR: 0.25,
};

export const CURRENCY_OPTIONS = [
	{
		value: "sar",
		code: "SAR",
		label: { en: "SAR", ar: "\u0631\u064a\u0627\u0644" },
		longLabel: { en: "Saudi Riyal", ar: "\u0631\u064a\u0627\u0644" },
	},
	{
		value: "usd",
		code: "USD",
		label: { en: "USD", ar: "\u062f\u0648\u0644\u0627\u0631" },
		longLabel: { en: "US Dollars", ar: "\u0627\u0644\u062f\u0648\u0644\u0627\u0631 \u0627\u0644\u0623\u0645\u0631\u064a\u0643\u064a" },
	},
	{
		value: "eur",
		code: "EUR",
		label: { en: "EUR", ar: "\u064a\u0648\u0631\u0648" },
		longLabel: { en: "Euro", ar: "\u0627\u0644\u064a\u0648\u0631\u0648" },
	},
];

export const normalizeCurrency = (value = "") => {
	const normalized = String(value || "").trim().toLowerCase();
	if (["sar", "rial", "riyal", "\u0631\u064a\u0627\u0644"].includes(normalized)) return "sar";
	if (
		[
			"usd",
			"dollar",
			"dollars",
			"us dollar",
			"us dollars",
			"\u062f\u0648\u0644\u0627\u0631",
			"\u0627\u0644\u062f\u0648\u0644\u0627\u0631 \u0627\u0644\u0623\u0645\u0631\u064a\u0643\u064a",
		].includes(normalized)
	) {
		return "usd";
	}
	if (["eur", "euro", "euros", "\u064a\u0648\u0631\u0648", "\u0627\u0644\u064a\u0648\u0631\u0648"].includes(normalized)) return "eur";
	return null;
};

export const currencyFromSearch = (search = "") => {
	const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
	return (
		normalizeCurrency(params.get(CURRENCY_QUERY_PARAM)) ||
		normalizeCurrency(params.get("selectedCurrency"))
	);
};

export const currencyOptionLabel = (currency = DEFAULT_CURRENCY, language = "en", long = false) => {
	const normalized = normalizeCurrency(currency) || DEFAULT_CURRENCY;
	const option = CURRENCY_OPTIONS.find((item) => item.value === normalized) || CURRENCY_OPTIONS[0];
	const labels = long ? option.longLabel : option.label;
	return labels[language === "ar" ? "ar" : "en"] || option.code;
};

export const currencyCode = (currency = DEFAULT_CURRENCY) => {
	const normalized = normalizeCurrency(currency) || DEFAULT_CURRENCY;
	return CURRENCY_OPTIONS.find((item) => item.value === normalized)?.code || "SAR";
};

export const currencyOptions = (language = "en", long = false) =>
	CURRENCY_OPTIONS.map((option) => ({
		value: option.value,
		code: option.code,
		label: (long ? option.longLabel : option.label)[language === "ar" ? "ar" : "en"],
	}));

export const convertSarAmount = (amount = 0, currency = DEFAULT_CURRENCY, rates = DEFAULT_CURRENCY_RATES) => {
	const numeric = Number(amount || 0);
	if (!Number.isFinite(numeric)) return 0;
	const normalized = normalizeCurrency(currency) || DEFAULT_CURRENCY;
	if (normalized === "usd") return numeric * Number(rates?.SAR_USD || DEFAULT_CURRENCY_RATES.SAR_USD);
	if (normalized === "eur") return numeric * Number(rates?.SAR_EUR || DEFAULT_CURRENCY_RATES.SAR_EUR);
	return numeric;
};

export const addCurrencyToHref = (href = "", currency = DEFAULT_CURRENCY, force = false) => {
	const normalizedCurrency = normalizeCurrency(currency) || DEFAULT_CURRENCY;
	const rawHref = String(href || "");
	if (!rawHref || rawHref.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(rawHref)) {
		return rawHref;
	}

	const hashIndex = rawHref.indexOf("#");
	const hash = hashIndex === -1 ? "" : rawHref.slice(hashIndex);
	const withoutHash = hashIndex === -1 ? rawHref : rawHref.slice(0, hashIndex);
	const queryIndex = withoutHash.indexOf("?");
	const path = queryIndex === -1 ? withoutHash || "/" : withoutHash.slice(0, queryIndex) || "/";
	const query = queryIndex === -1 ? "" : withoutHash.slice(queryIndex + 1);
	const params = new URLSearchParams(query);

	if (force || normalizedCurrency !== DEFAULT_CURRENCY || params.has(CURRENCY_QUERY_PARAM)) {
		params.set(CURRENCY_QUERY_PARAM, normalizedCurrency);
	} else {
		params.delete(CURRENCY_QUERY_PARAM);
	}

	const queryString = params.toString();
	return `${path}${queryString ? `?${queryString}` : ""}${hash}`;
};
