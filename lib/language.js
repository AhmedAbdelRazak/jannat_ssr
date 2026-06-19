export const LANGUAGE_QUERY_PARAM = "lang";

export const normalizeLanguage = (value) => {
	const normalized = String(value || "").trim().toLowerCase();
	if (["ar", "ara", "arabic"].includes(normalized)) return "ar";
	if (["en", "eng", "english"].includes(normalized)) return "en";
	return null;
};

export const languageFromSearch = (search = "") => {
	const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
	return (
		normalizeLanguage(params.get(LANGUAGE_QUERY_PARAM)) ||
		normalizeLanguage(params.get("language")) ||
		normalizeLanguage(params.get("locale"))
	);
};

export const addLanguageToHref = (href = "", language = "en") => {
	const normalizedLanguage = normalizeLanguage(language) || "en";
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
	params.set(LANGUAGE_QUERY_PARAM, normalizedLanguage);
	const queryString = params.toString();

	return `${path}${queryString ? `?${queryString}` : ""}${hash}`;
};
