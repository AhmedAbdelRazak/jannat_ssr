"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FACEBOOK_PIXEL_ID, GOOGLE_ANALYTICS_ID } from "../lib/constants";
import {
	sanitizeSensitivePagePath,
	sanitizeSensitiveUrl,
} from "../lib/urlPrivacy";

export default function Analytics() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const lastPathRef = useRef("");
	const [loadLibraries, setLoadLibraries] = useState(false);
	const pagePath = useMemo(() => {
		const query = searchParams?.toString() || "";
		return sanitizeSensitivePagePath(pathname || "/", query ? `?${query}` : "");
	}, [pathname, searchParams]);

	useEffect(() => {
		if (loadLibraries || (!GOOGLE_ANALYTICS_ID && !FACEBOOK_PIXEL_ID)) return undefined;
		let loaded = false;
		const load = () => {
			if (loaded) return;
			loaded = true;
			setLoadLibraries(true);
		};
		const timer = window.setTimeout(load, 5500);
		const onVisibilityChange = () => {
			if (document.visibilityState === "hidden") load();
		};
		const listenerOptions = { passive: true, once: true };
		window.addEventListener("pointerdown", load, listenerOptions);
		window.addEventListener("keydown", load, { once: true });
		window.addEventListener("touchstart", load, listenerOptions);
		document.addEventListener("visibilitychange", onVisibilityChange);
		return () => {
			window.clearTimeout(timer);
			window.removeEventListener("pointerdown", load);
			window.removeEventListener("keydown", load);
			window.removeEventListener("touchstart", load);
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, [loadLibraries]);

	useEffect(() => {
		if (!pagePath || lastPathRef.current === pagePath) return;
		if (!lastPathRef.current) {
			lastPathRef.current = pagePath;
			return;
		}
		lastPathRef.current = pagePath;
		if (GOOGLE_ANALYTICS_ID && typeof window.gtag === "function") {
			window.gtag("event", "page_view", {
				page_path: pagePath,
				page_location: sanitizeSensitiveUrl(window.location.href),
				page_title: document.title,
			});
		}
		if (FACEBOOK_PIXEL_ID && typeof window.fbq === "function") {
			window.fbq("track", "PageView");
		}
	}, [pagePath]);

	return (
		<>
			{GOOGLE_ANALYTICS_ID ? (
				<>
					{loadLibraries ? (
						<Script
							src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
							strategy="afterInteractive"
						/>
					) : null}
					<Script id="jannat-gtag" strategy="afterInteractive">
						{`
							function jannatSafeAnalyticsUrl() {
								var url = new URL(window.location.href);
								Array.from(url.searchParams.keys()).forEach(function(key) {
									var normalized = String(key || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
									if (['reviewtoken', 'confirmationnumber', 'confirmationumber', 'confirmation'].includes(normalized)) {
										url.searchParams.delete(key);
									}
								});
								var rawHash = String(url.hash || '').replace(/^#/, '');
								var hashQuestionIndex = rawHash.indexOf('?');
								var hashHasBareParams = hashQuestionIndex < 0 && rawHash.indexOf('=') >= 0;
								if (hashQuestionIndex >= 0 || hashHasBareParams) {
									var hashAnchor = hashQuestionIndex >= 0 ? rawHash.slice(0, hashQuestionIndex) : '';
									var hashQuery = hashQuestionIndex >= 0 ? rawHash.slice(hashQuestionIndex + 1) : rawHash;
									var hashParams = new URLSearchParams(hashQuery);
									Array.from(hashParams.keys()).forEach(function(key) {
										var normalized = String(key || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
										if (['reviewtoken', 'confirmationnumber', 'confirmationumber', 'confirmation'].includes(normalized)) {
											hashParams.delete(key);
										}
									});
									var remainingHashQuery = hashParams.toString();
									url.hash = hashAnchor ? '#' + hashAnchor + (remainingHashQuery ? '?' + remainingHashQuery : '') : (remainingHashQuery ? '#' + remainingHashQuery : '');
								}
								return url;
							}
							window.dataLayer = window.dataLayer || [];
							function gtag(){dataLayer.push(arguments);}
							window.gtag = window.gtag || gtag;
							gtag('js', new Date());
							gtag('config', '${GOOGLE_ANALYTICS_ID}', { send_page_view: false });
							var jannatAnalyticsUrl = jannatSafeAnalyticsUrl();
							gtag('event', 'page_view', {
								page_path: jannatAnalyticsUrl.pathname + jannatAnalyticsUrl.search,
								page_location: jannatAnalyticsUrl.toString(),
								page_title: document.title
							});
						`}
					</Script>
				</>
			) : null}
			{FACEBOOK_PIXEL_ID ? (
				<>
					{loadLibraries ? (
						<Script
							src="https://connect.facebook.net/en_US/fbevents.js"
							strategy="afterInteractive"
						/>
					) : null}
					<Script id="jannat-facebook-pixel" strategy="afterInteractive">
						{`
							!function(f,n)
							{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
							n.callMethod.apply(n,arguments):n.queue.push(arguments)};
							if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
							n.queue=[]}(window);
							fbq('init', '${FACEBOOK_PIXEL_ID}');
							fbq('track', 'PageView');
						`}
					</Script>
					<noscript>
						<img
							height="1"
							width="1"
							style={{ display: "none" }}
							alt=""
							referrerPolicy="no-referrer"
							src={`https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
						/>
					</noscript>
				</>
			) : null}
		</>
	);
}
