import { NextResponse } from "next/server";

const SOURCE_ORIGIN = "https://jannatbooking.com";
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const MIME_BY_EXTENSION = {
	avif: "image/avif",
	gif: "image/gif",
	jpeg: "image/jpeg",
	jpg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
};

const safeSegments = (segments = []) =>
	segments
		.map((segment) => decodeURIComponent(String(segment || "")))
		.filter(Boolean)
		.filter((segment) => !segment.includes("..") && !segment.includes("\\"));

const contentTypeFor = (path = "", fallback = "") => {
	if (fallback && fallback.startsWith("image/")) return fallback;
	const extension = path.split(".").pop()?.toLowerCase();
	return MIME_BY_EXTENSION[extension] || "application/octet-stream";
};

const responseHeaders = (contentType) => ({
	"Cache-Control": CACHE_CONTROL,
	"Content-Type": contentType,
	"Cross-Origin-Resource-Policy": "same-origin",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"X-Content-Type-Options": "nosniff",
	"X-Robots-Tag": "noindex, noimageindex",
});

const serveAsset = async (params, headOnly = false) => {
	const segments = safeSegments(params?.path);
	if (!segments.length || segments.length !== (params?.path || []).length) {
		return new NextResponse("Not found", { status: 404 });
	}

	const assetPath = segments.map(encodeURIComponent).join("/");
	const upstreamUrl = `${SOURCE_ORIGIN}/assets/${assetPath}`;
	const upstream = await fetch(upstreamUrl, {
		headers: { "User-Agent": "jannatbookingAssetProxy/1.0" },
		next: { revalidate: 31536000 },
	});

	if (!upstream.ok) {
		return new NextResponse("Not found", { status: 404 });
	}

	const contentType = contentTypeFor(assetPath, upstream.headers.get("content-type") || "");
	return new NextResponse(headOnly ? null : upstream.body, {
		status: 200,
		headers: responseHeaders(contentType),
	});
};

export async function GET(_request, { params }) {
	return serveAsset(await params);
}

export async function HEAD(_request, { params }) {
	return serveAsset(await params, true);
}
