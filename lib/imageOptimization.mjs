const OPTIMIZED_ZAD_AJYAD_VERSION = "?v=zad-ajyad-20260712";

export const canOptimizeImageUrl = (value = "") => {
	const source = String(value || "").trim();
	if (!source) return false;

	if (source.startsWith("/")) {
		try {
			const url = new URL(source, "https://jannatbooking.com");
			if (url.pathname.startsWith("/destinations/")) return url.search === "";
			if (url.pathname.startsWith("/assets/")) {
				return url.search === "" || url.search === OPTIMIZED_ZAD_AJYAD_VERSION;
			}
			return false;
		} catch (_error) {
			return false;
		}
	}

	try {
		const url = new URL(source);
		if (url.protocol !== "https:") return false;
		if (url.hostname === "res.cloudinary.com") {
			return url.pathname.startsWith("/infiniteapps/image/upload/");
		}
		return url.hostname === "assets.zyrosite.com";
	} catch (_error) {
		return false;
	}
};
