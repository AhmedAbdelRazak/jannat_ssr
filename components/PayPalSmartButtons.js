"use client";

import { PayPalButtons } from "@paypal/react-paypal-js";
import { useEffect, useMemo, useState } from "react";

const isRenderFailure = (error) =>
	Boolean(error?.componentStack) ||
	/failed to render\s*<paypalbuttons/i.test(String(error?.message || ""));

export default function PayPalSmartButtons({
	fallback = null,
	forceReRender = [],
	onError,
	...buttonProps
}) {
	const [renderFailed, setRenderFailed] = useState(false);
	const resetKey = useMemo(
		() => forceReRender.map((value) => String(value)).join("|"),
		[forceReRender]
	);

	useEffect(() => {
		setRenderFailed(false);
	}, [resetKey]);

	const handleError = (error) => {
		if (isRenderFailure(error)) setRenderFailed(true);
		return onError?.(error);
	};

	if (renderFailed) return fallback;

	return (
		<PayPalButtons
			{...buttonProps}
			className="paypal-smart-buttons"
			style={{ layout: "vertical", shape: "rect" }}
			forceReRender={forceReRender}
			onError={handleError}
		>
			{fallback}
		</PayPalButtons>
	);
}
