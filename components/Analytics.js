"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { FACEBOOK_PIXEL_ID, GOOGLE_ANALYTICS_ID } from "../lib/constants";

export default function Analytics() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const lastPathRef = useRef("");
	const pagePath = useMemo(() => {
		const query = searchParams?.toString();
		return `${pathname || "/"}${query ? `?${query}` : ""}`;
	}, [pathname, searchParams]);

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
				page_location: window.location.href,
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
					<Script
						src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
						strategy="afterInteractive"
					/>
					<Script id="jannat-gtag" strategy="afterInteractive">
						{`
							window.dataLayer = window.dataLayer || [];
							function gtag(){dataLayer.push(arguments);}
							window.gtag = window.gtag || gtag;
							gtag('js', new Date());
							gtag('config', '${GOOGLE_ANALYTICS_ID}', { send_page_view: false });
							gtag('event', 'page_view', {
								page_path: window.location.pathname + window.location.search,
								page_location: window.location.href,
								page_title: document.title
							});
						`}
					</Script>
				</>
			) : null}
			{FACEBOOK_PIXEL_ID ? (
				<>
					<Script id="jannat-facebook-pixel" strategy="afterInteractive">
						{`
							!function(f,b,e,v,n,t,s)
							{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
							n.callMethod.apply(n,arguments):n.queue.push(arguments)};
							if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
							n.queue=[];t=b.createElement(e);t.async=!0;
							t.src=v;s=b.getElementsByTagName(e)[0];
							s.parentNode.insertBefore(t,s)}(window, document,'script',
							'https://connect.facebook.net/en_US/fbevents.js');
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
							src={`https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
						/>
					</noscript>
				</>
			) : null}
		</>
	);
}
