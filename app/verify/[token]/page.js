import { redirect } from "next/navigation";

export const metadata = {
	title: "Verification",
	robots: { index: false, follow: false },
};

export default async function VerifyTokenRedirect({ params }) {
	const { token } = await params;
	redirect(`/reservation-verification?token=${encodeURIComponent(token)}`);
}
