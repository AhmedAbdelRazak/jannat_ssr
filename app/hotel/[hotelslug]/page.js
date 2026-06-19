import { redirect } from "next/navigation";

export async function generateMetadata({ params }) {
	const { hotelslug } = await params;
	return {
		title: "Hotel",
		alternates: { canonical: `/single-hotel/${hotelslug}` },
	};
}

export default async function LegacyHotelRedirect({ params }) {
	const { hotelslug } = await params;
	redirect(`/single-hotel/${hotelslug}`);
}
