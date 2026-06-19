import { BRAND_URL } from "./constants";

const JANNAT_ASSET_HOSTS = new Set(["jannatbooking.com", "www.jannatbooking.com"]);

export const normalizeImageUrl = (value = "") => {
	const raw = typeof value === "string" ? value : value?.url || "";
	if (!raw) return "";

	if (raw.startsWith("/")) {
		return raw;
	}

	try {
		const url = new URL(raw, BRAND_URL);
		if (JANNAT_ASSET_HOSTS.has(url.hostname) && url.pathname.startsWith("/assets/")) {
			return `${url.pathname}${url.search}`;
		}
		return url.href;
	} catch (_error) {
		return raw;
	}
};

export const normalizedOpenGraphImage = (value = "") => normalizeImageUrl(value) || value;
