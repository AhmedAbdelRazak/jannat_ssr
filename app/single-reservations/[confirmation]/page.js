import { redirect } from "next/navigation";

export const metadata = {
	title: "Reservation Details",
	robots: { index: false, follow: false },
};

export default async function SingleReservationsRedirect({ params }) {
	const { confirmation } = await params;
	redirect(`/single-reservation/${encodeURIComponent(confirmation)}`);
}
