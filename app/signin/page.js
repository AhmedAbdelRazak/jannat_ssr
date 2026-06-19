import { Suspense } from "react";
import AuthPageClient from "../../components/AuthPageClient";
import { BRAND_NAME } from "../../lib/constants";

export const metadata = {
	title: `Sign in | ${BRAND_NAME}`,
	description: "Sign in to your Jannat Booking guest account.",
	robots: { index: false, follow: false },
};

export default function SigninPage() {
	return (
		<Suspense fallback={null}>
			<AuthPageClient mode="signin" />
		</Suspense>
	);
}
