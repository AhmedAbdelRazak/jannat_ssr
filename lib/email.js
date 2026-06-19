const EMAIL_AT = String.fromCharCode(64);
const EMAIL_TOKEN = " [at] ";

export const normalizeEmail = (email = "") =>
	String(email || "")
		.trim()
		.replace(/\s*\[at\]\s*/i, EMAIL_AT)
		.replace(/\s+at\s+/i, EMAIL_AT);

export const splitEmail = (email = "") => {
	const value = normalizeEmail(email);
	const [local, ...domainParts] = value.split(EMAIL_AT);
	const domain = domainParts.join(EMAIL_AT);
	return {
		value,
		local: String(local || "").trim(),
		domain: String(domain || "").trim(),
	};
};

export const composeEmail = (local = "", domain = "") =>
	local && domain ? `${local}${EMAIL_AT}${domain}` : String(local || domain || "");

export const maskEmailForClient = (email = "") => {
	const { local, domain, value } = splitEmail(email);
	return local && domain ? `${local}${EMAIL_TOKEN}${domain}` : value;
};

export const maskWebsiteEmails = (website = {}) => ({
	...website,
	contactEmail: maskEmailForClient(website?.contactEmail),
	officialEmail: maskEmailForClient(website?.officialEmail),
});

export const mailtoHref = (email = "") => {
	const { local, domain, value } = splitEmail(email);
	if (!local || !domain) return value ? `mailto:${encodeURIComponent(value)}` : "#";
	return `mailto:${encodeURIComponent(local)}%40${encodeURIComponent(domain)}`;
};

export const emailActionProps = (email = "") => ({
	href: "#",
	onClick: (event) => {
		event.preventDefault();
		if (typeof window !== "undefined") {
			window.location.href = mailtoHref(email);
		}
	},
});
