import PasswordResetClient from "../../../../../components/PasswordResetClient";
import { BRAND_NAME } from "../../../../../lib/constants";

export const metadata = {
	title: `Create New Password | ${BRAND_NAME}`,
	description: "Create a new Jannat Booking account password.",
	robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ params }) {
	const { token } = await params;
	return <PasswordResetClient token={token} />;
}
