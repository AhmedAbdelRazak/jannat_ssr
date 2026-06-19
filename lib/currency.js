export const CURRENCY_QUERY_PARAM = "currency";

export const DEFAULT_CURRENCY = "sar";

export const DEFAULT_CURRENCY_RATES = {
	SAR_USD: 0.2667,
	SAR_EUR: 0.245,
	SAR_GBP: 0.207,
	SAR_JOD: 0.189,
	SAR_DZD: 35.8,
	SAR_EGP: 12.8,
	SAR_PKR: 74.4,
	SAR_INR: 22.3,
	SAR_MYR: 1.13,
	SAR_IDR: 4350,
};

export const CURRENCY_OPTIONS = [
	{
		value: "sar",
		code: "SAR",
		label: { en: "SAR", ar: "\u0631\u064a\u0627\u0644" },
		longLabel: { en: "Saudi Riyal", ar: "\u0627\u0644\u0631\u064a\u0627\u0644 \u0627\u0644\u0633\u0639\u0648\u062f\u064a" },
		market: { en: "Saudi Arabia", ar: "\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629" },
		fractionDigits: 0,
		aliases: ["rial", "riyal", "saudi riyal", "\u0631\u064a\u0627\u0644", "\u0627\u0644\u0631\u064a\u0627\u0644", "\u0627\u0644\u0631\u064a\u0627\u0644 \u0627\u0644\u0633\u0639\u0648\u062f\u064a"],
	},
	{
		value: "usd",
		code: "USD",
		label: { en: "USD", ar: "\u062f\u0648\u0644\u0627\u0631" },
		longLabel: { en: "US Dollar", ar: "\u0627\u0644\u062f\u0648\u0644\u0627\u0631 \u0627\u0644\u0623\u0645\u0631\u064a\u0643\u064a" },
		market: { en: "United States", ar: "\u0627\u0644\u0648\u0644\u0627\u064a\u0627\u062a \u0627\u0644\u0645\u062a\u062d\u062f\u0629" },
		fractionDigits: 2,
		aliases: ["dollar", "dollars", "us dollar", "us dollars", "\u062f\u0648\u0644\u0627\u0631", "\u0627\u0644\u062f\u0648\u0644\u0627\u0631", "\u0627\u0644\u062f\u0648\u0644\u0627\u0631 \u0627\u0644\u0623\u0645\u0631\u064a\u0643\u064a"],
	},
	{
		value: "eur",
		code: "EUR",
		label: { en: "EUR", ar: "\u064a\u0648\u0631\u0648" },
		longLabel: { en: "Euro", ar: "\u0627\u0644\u064a\u0648\u0631\u0648" },
		market: { en: "Eurozone", ar: "\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u064a\u0648\u0631\u0648" },
		fractionDigits: 2,
		aliases: ["euro", "euros", "\u064a\u0648\u0631\u0648", "\u0627\u0644\u064a\u0648\u0631\u0648"],
	},
	{
		value: "gbp",
		code: "GBP",
		label: { en: "GBP", ar: "\u0625\u0633\u062a\u0631\u0644\u064a\u0646\u064a" },
		longLabel: { en: "British Pound", ar: "\u0627\u0644\u062c\u0646\u064a\u0647 \u0627\u0644\u0625\u0633\u062a\u0631\u0644\u064a\u0646\u064a" },
		market: { en: "United Kingdom", ar: "\u0628\u0631\u064a\u0637\u0627\u0646\u064a\u0627" },
		fractionDigits: 2,
		aliases: ["pound", "pounds", "british pound", "sterling", "\u062c\u0646\u064a\u0647 \u0627\u0633\u062a\u0631\u0644\u064a\u0646\u064a", "\u0627\u0644\u062c\u0646\u064a\u0647 \u0627\u0644\u0625\u0633\u062a\u0631\u0644\u064a\u0646\u064a"],
	},
	{
		value: "jod",
		code: "JOD",
		label: { en: "JOD", ar: "\u062f\u064a\u0646\u0627\u0631" },
		longLabel: { en: "Jordanian Dinar", ar: "\u0627\u0644\u062f\u064a\u0646\u0627\u0631 \u0627\u0644\u0623\u0631\u062f\u0646\u064a" },
		market: { en: "Jordan", ar: "\u0627\u0644\u0623\u0631\u062f\u0646" },
		fractionDigits: 2,
		aliases: ["jordan", "jordanian dinar", "\u062f\u064a\u0646\u0627\u0631 \u0623\u0631\u062f\u0646\u064a", "\u0627\u0644\u062f\u064a\u0646\u0627\u0631 \u0627\u0644\u0623\u0631\u062f\u0646\u064a"],
	},
	{
		value: "egp",
		code: "EGP",
		label: { en: "EGP", ar: "\u062c\u0646\u064a\u0647" },
		longLabel: { en: "Egyptian Pound", ar: "\u0627\u0644\u062c\u0646\u064a\u0647 \u0627\u0644\u0645\u0635\u0631\u064a" },
		market: { en: "Egypt", ar: "\u0645\u0635\u0631" },
		fractionDigits: 0,
		aliases: ["egypt", "egyptian pound", "\u062c\u0646\u064a\u0647 \u0645\u0635\u0631\u064a", "\u0627\u0644\u062c\u0646\u064a\u0647 \u0627\u0644\u0645\u0635\u0631\u064a"],
	},
	{
		value: "dzd",
		code: "DZD",
		label: { en: "DZD", ar: "\u062f.\u062c" },
		longLabel: { en: "Algerian Dinar", ar: "\u0627\u0644\u062f\u064a\u0646\u0627\u0631 \u0627\u0644\u062c\u0632\u0627\u0626\u0631\u064a" },
		market: { en: "Algeria", ar: "\u0627\u0644\u062c\u0632\u0627\u0626\u0631" },
		fractionDigits: 0,
		aliases: ["algeria", "algerian dinar", "\u062f\u064a\u0646\u0627\u0631 \u062c\u0632\u0627\u0626\u0631\u064a", "\u0627\u0644\u062f\u064a\u0646\u0627\u0631 \u0627\u0644\u062c\u0632\u0627\u0626\u0631\u064a"],
	},
	{
		value: "pkr",
		code: "PKR",
		label: { en: "PKR", ar: "\u0631\u0648\u0628\u064a\u0629" },
		longLabel: { en: "Pakistani Rupee", ar: "\u0627\u0644\u0631\u0648\u0628\u064a\u0629 \u0627\u0644\u0628\u0627\u0643\u0633\u062a\u0627\u0646\u064a\u0629" },
		market: { en: "Pakistan", ar: "\u0628\u0627\u0643\u0633\u062a\u0627\u0646" },
		fractionDigits: 0,
		aliases: ["pakistan", "pakistani rupee", "\u0631\u0648\u0628\u064a\u0629 \u0628\u0627\u0643\u0633\u062a\u0627\u0646\u064a\u0629", "\u0627\u0644\u0631\u0648\u0628\u064a\u0629 \u0627\u0644\u0628\u0627\u0643\u0633\u062a\u0627\u0646\u064a\u0629"],
	},
	{
		value: "inr",
		code: "INR",
		label: { en: "INR", ar: "\u0631\u0648\u0628\u064a\u0629" },
		longLabel: { en: "Indian Rupee", ar: "\u0627\u0644\u0631\u0648\u0628\u064a\u0629 \u0627\u0644\u0647\u0646\u062f\u064a\u0629" },
		market: { en: "India", ar: "\u0627\u0644\u0647\u0646\u062f" },
		fractionDigits: 0,
		aliases: ["india", "indian rupee", "\u0631\u0648\u0628\u064a\u0629 \u0647\u0646\u062f\u064a\u0629", "\u0627\u0644\u0631\u0648\u0628\u064a\u0629 \u0627\u0644\u0647\u0646\u062f\u064a\u0629"],
	},
	{
		value: "myr",
		code: "MYR",
		label: { en: "MYR", ar: "\u0631\u064a\u0646\u063a\u064a\u062a" },
		longLabel: { en: "Malaysian Ringgit", ar: "\u0627\u0644\u0631\u064a\u0646\u063a\u064a\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0632\u064a" },
		market: { en: "Malaysia", ar: "\u0645\u0627\u0644\u064a\u0632\u064a\u0627" },
		fractionDigits: 2,
		aliases: ["malaysia", "malaysian ringgit", "\u0631\u064a\u0646\u063a\u064a\u062a \u0645\u0627\u0644\u064a\u0632\u064a", "\u0627\u0644\u0631\u064a\u0646\u063a\u064a\u062a \u0627\u0644\u0645\u0627\u0644\u064a\u0632\u064a"],
	},
	{
		value: "idr",
		code: "IDR",
		label: { en: "IDR", ar: "\u0631\u0648\u0628\u064a\u0629" },
		longLabel: { en: "Indonesian Rupiah", ar: "\u0627\u0644\u0631\u0648\u0628\u064a\u0629 \u0627\u0644\u0625\u0646\u062f\u0648\u0646\u064a\u0633\u064a\u0629" },
		market: { en: "Indonesia", ar: "\u0625\u0646\u062f\u0648\u0646\u064a\u0633\u064a\u0627" },
		fractionDigits: 0,
		aliases: ["indonesia", "indonesian rupiah", "\u0631\u0648\u0628\u064a\u0629 \u0625\u0646\u062f\u0648\u0646\u064a\u0633\u064a\u0629", "\u0627\u0644\u0631\u0648\u0628\u064a\u0629 \u0627\u0644\u0625\u0646\u062f\u0648\u0646\u064a\u0633\u064a\u0629"],
	},
];

export const normalizeCurrency = (value = "") => {
	const normalized = String(value || "").trim().toLowerCase();
	const option = CURRENCY_OPTIONS.find((item) => {
		const aliases = [
			item.value,
			item.code,
			item.label.en,
			item.label.ar,
			item.longLabel.en,
			item.longLabel.ar,
			...(item.aliases || []),
		];
		return aliases.some((alias) => String(alias || "").trim().toLowerCase() === normalized);
	});
	if (option) return option.value;
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

export const currencyRateKey = (currency = DEFAULT_CURRENCY) => `SAR_${currencyCode(currency)}`;

export const currencyFractionDigits = (currency = DEFAULT_CURRENCY) => {
	const normalized = normalizeCurrency(currency) || DEFAULT_CURRENCY;
	return CURRENCY_OPTIONS.find((item) => item.value === normalized)?.fractionDigits ?? 2;
};

export const currencyOptions = (language = "en", long = false) =>
	CURRENCY_OPTIONS.map((option) => ({
		value: option.value,
		code: option.code,
		label: (long ? option.longLabel : option.label)[language === "ar" ? "ar" : "en"],
		market: option.market?.[language === "ar" ? "ar" : "en"] || option.code,
	}));

export const normalizeCurrencyRates = (rates = {}) =>
	CURRENCY_OPTIONS.reduce(
		(nextRates, option) => {
			if (option.value === DEFAULT_CURRENCY) return nextRates;
			const key = `SAR_${option.code}`;
			const camelKey = `sar${option.code[0]}${option.code.slice(1).toLowerCase()}`;
			const directCode = option.code;
			const raw =
				rates?.[key] ??
				rates?.[camelKey] ??
				rates?.[directCode] ??
				rates?.[directCode.toLowerCase()] ??
				DEFAULT_CURRENCY_RATES[key];
			const numeric = Number(raw);
			nextRates[key] = Number.isFinite(numeric) && numeric > 0
				? numeric
				: DEFAULT_CURRENCY_RATES[key];
			return nextRates;
		},
		{ ...DEFAULT_CURRENCY_RATES }
	);

export const convertSarAmount = (amount = 0, currency = DEFAULT_CURRENCY, rates = DEFAULT_CURRENCY_RATES) => {
	const numeric = Number(amount || 0);
	if (!Number.isFinite(numeric)) return 0;
	const normalized = normalizeCurrency(currency) || DEFAULT_CURRENCY;
	if (normalized === DEFAULT_CURRENCY) return numeric;
	const key = currencyRateKey(normalized);
	const rate = Number(rates?.[key] || DEFAULT_CURRENCY_RATES[key]);
	return Number.isFinite(rate) && rate > 0 ? numeric * rate : numeric;
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
