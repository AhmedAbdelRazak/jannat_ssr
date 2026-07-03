"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SupportWidget = dynamic(() => import("./SupportWidget"), { ssr: false });

const hasChatIntent = () => {
	if (typeof window === "undefined") return false;
	const params = new URLSearchParams(window.location.search);
	return [
		"chat",
		"chatName",
		"chatContact",
		"chatHotelId",
		"chatHotelName",
		"chatInquiry",
		"chatDetails",
		"chatReservationNumber",
		"chatLanguage",
	].some((key) => params.has(key));
};

export default function LazySupportWidget({
	hotels = [],
	website = {},
	supportConfig = {},
}) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (hasChatIntent()) {
			setReady(true);
			return undefined;
		}

		let cancelled = false;
		const load = () => {
			if (!cancelled) setReady(true);
		};
		const idleId =
			typeof window.requestIdleCallback === "function"
				? window.requestIdleCallback(load, { timeout: 1800 })
				: window.setTimeout(load, 1200);

		return () => {
			cancelled = true;
			if (typeof window.cancelIdleCallback === "function" && typeof idleId === "number") {
				window.cancelIdleCallback(idleId);
			} else {
				window.clearTimeout(idleId);
			}
		};
	}, []);

	return ready ? (
		<SupportWidget
			hotels={hotels}
			website={website}
			supportConfig={supportConfig}
		/>
	) : null;
}
