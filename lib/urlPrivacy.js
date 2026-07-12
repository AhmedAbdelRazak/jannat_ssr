export const SENSITIVE_REVIEW_QUERY_KEYS = new Set([
	"reviewtoken",
	"confirmationnumber",
	"confirmationumber",
	"confirmation",
]);

export const normalizedQueryKey = (key = "") =>
	String(key || "")
		.replace(/[^a-z0-9]/gi, "")
		.toLowerCase();

export const isSensitiveReviewQueryKey = (key = "") =>
	SENSITIVE_REVIEW_QUERY_KEYS.has(normalizedQueryKey(key));

export const sanitizeSensitiveSearch = (search = "") => {
	const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
	[...params.keys()].forEach((key) => {
		if (isSensitiveReviewQueryKey(key)) params.delete(key);
	});
	const query = params.toString();
	return query ? `?${query}` : "";
};

export const sanitizeSensitivePagePath = (pathname = "/", search = "") =>
	`${pathname || "/"}${sanitizeSensitiveSearch(search)}`;

export const sanitizeSensitiveHash = (hash = "") => {
	const rawHash = String(hash || "").replace(/^#/, "");
	if (!rawHash) return "";
	const questionIndex = rawHash.indexOf("?");
	const hasBareParams = questionIndex < 0 && rawHash.includes("=");
	if (questionIndex < 0 && !hasBareParams) return `#${rawHash}`;
	const anchor = questionIndex >= 0 ? rawHash.slice(0, questionIndex) : "";
	const query = questionIndex >= 0 ? rawHash.slice(questionIndex + 1) : rawHash;
	const params = new URLSearchParams(query);
	[...params.keys()].forEach((key) => {
		if (isSensitiveReviewQueryKey(key)) params.delete(key);
	});
	const sanitizedQuery = params.toString();
	if (anchor) return `#${anchor}${sanitizedQuery ? `?${sanitizedQuery}` : ""}`;
	return sanitizedQuery ? `#${sanitizedQuery}` : "";
};

export const sanitizeSensitiveUrl = (href = "") => {
	try {
		const base =
			typeof window !== "undefined" && window.location?.origin
				? window.location.origin
				: "https://jannatbooking.com";
		const url = new URL(String(href || "/"), base);
		url.search = sanitizeSensitiveSearch(url.search);
		url.hash = sanitizeSensitiveHash(url.hash);
		return url.toString();
	} catch (_error) {
		return String(href || "");
	}
};
