"use client";

import { useEffect, useMemo, useState } from "react";
import { emailActionProps, mailtoHref, splitEmail } from "../lib/email";

export { emailActionProps, mailtoHref };

export default function EmailText({ email = "", as: Tag = "bdi", className = "ltr-value" }) {
	const [hydrated, setHydrated] = useState(false);
	const parts = useMemo(() => splitEmail(email), [email]);

	useEffect(() => {
		setHydrated(true);
	}, []);

	if (!parts.local || !parts.domain) {
		return (
			<Tag dir="ltr" className={className}>
				{parts.value}
			</Tag>
		);
	}

	return (
		<Tag dir="ltr" className={className} suppressHydrationWarning>
			{parts.local}
			<span aria-hidden="true">{hydrated ? String.fromCharCode(64) : " at "}</span>
			{parts.domain}
		</Tag>
	);
}
