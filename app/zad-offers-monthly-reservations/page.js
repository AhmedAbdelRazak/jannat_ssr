import { redirect } from "next/navigation";

export const metadata = {
	robots: { index: false, follow: true },
};

export default function LegacyOffersRedirect() {
	redirect("/jannat-offers-monthly-reservations");
}
