import { NextResponse } from "next/server";

const PUBLIC_HOST = "jannatbooking.com";
const HSTS_VALUE = "max-age=31536000";
const ALLOWED_IMAGE_REFERERS = new Set([
	PUBLIC_HOST,
	"jannatbooking.com",
	"www.jannatbooking.com",
	"localhost",
	"127.0.0.1",
]);

const readScheme = (request) => {
	const cfVisitor = request.headers.get("cf-visitor");
	if (cfVisitor) {
		try {
			const parsed = JSON.parse(cfVisitor);
			const scheme = String(parsed?.scheme || "").toLowerCase();
			if (scheme) return scheme;
		} catch (_error) {
			if (cfVisitor.includes('"scheme":"http"') || cfVisitor.includes('"scheme": "http"')) {
				return "http";
			}
		}
	}

	const forwarded = request.headers.get("x-forwarded-proto");
	if (forwarded) return forwarded.split(",")[0].trim().toLowerCase();

	return "";
};

const requestHeadersWithLanguage = (request) => {
	const headers = new Headers(request.headers);
	const rawLanguage =
		request.nextUrl.searchParams.get("lang") ||
		request.nextUrl.searchParams.get("language") ||
		request.nextUrl.searchParams.get("locale") ||
		request.cookies.get("jannatBookingLanguage")?.value ||
		"";
	const language = ["ar", "ara", "arabic"].includes(String(rawLanguage).toLowerCase()) ? "ar" : "en";
	headers.set("x-jannat-language", language);
	return headers;
};

const isProtectedImagePath = (pathname = "") =>
	pathname.startsWith("/_next/image") || pathname.startsWith("/assets/");

const isAllowedImageReferer = (request) => {
	const referer = request.headers.get("referer");
	const fetchSite = String(request.headers.get("sec-fetch-site") || "").toLowerCase();

	if (fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none") {
		return true;
	}

	if (!referer) return fetchSite !== "cross-site";

	try {
		return ALLOWED_IMAGE_REFERERS.has(new URL(referer).hostname.toLowerCase());
	} catch (_error) {
		return false;
	}
};

export function proxy(request) {
	const host = String(request.headers.get("host") || "")
		.split(":")[0]
		.toLowerCase();
	const requestHeaders = requestHeadersWithLanguage(request);

	if (host !== PUBLIC_HOST) {
		return NextResponse.next({ request: { headers: requestHeaders } });
	}

	if (readScheme(request) === "http") {
		const secureUrl = request.nextUrl.clone();
		secureUrl.protocol = "https";
		secureUrl.hostname = PUBLIC_HOST;
		secureUrl.port = "";
		return NextResponse.redirect(secureUrl, 308);
	}

	if (isProtectedImagePath(request.nextUrl.pathname) && !isAllowedImageReferer(request)) {
		return new NextResponse("Forbidden", {
			status: 403,
			headers: {
				"Cross-Origin-Resource-Policy": "same-origin",
				"X-Robots-Tag": "noindex, noimageindex",
			},
		});
	}

	const response = NextResponse.next({ request: { headers: requestHeaders } });
	response.headers.set("Strict-Transport-Security", HSTS_VALUE);
	if (isProtectedImagePath(request.nextUrl.pathname)) {
		response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
		response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		response.headers.set("X-Robots-Tag", "noindex, noimageindex");
	}
	return response;
}

export const config = {
	matcher: [
		"/_next/image",
		"/assets/:path*",
		"/((?!_next/static|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|icons/).*)",
	],
};
