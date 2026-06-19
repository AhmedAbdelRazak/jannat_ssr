import PasswordForgotClient from "../../../../components/PasswordForgotClient";
import { BRAND_NAME } from "../../../../lib/constants";

export const metadata = {
	title: `Reset Password | ${BRAND_NAME}`,
	description: "Request a secure Jannat Booking password reset link.",
	robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
	return <PasswordForgotClient />;
}
