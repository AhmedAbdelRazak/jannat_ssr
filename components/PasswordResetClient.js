"use client";

import Link from "next/link";
import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { resetPasswordJannatClient } from "../lib/api";

export default function PasswordResetClient({ token }) {
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	const submit = async (event) => {
		event.preventDefault();
		setError("");
		setMessage("");
		if (newPassword.length < 6) {
			setError("Password must be at least 6 characters.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}
		setBusy(true);
		try {
			const response = await resetPasswordJannatClient({
				newPassword,
				resetPasswordLink: token,
			});
			setMessage(response?.message || "Your password has been reset.");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			setError(err.message || "Could not reset the password.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="auth-page">
			<div className="auth-shell container">
				<div className="auth-copy">
					<p className="eyebrow">Secure account</p>
					<h1>Create a new password</h1>
					<p>Use a new password for your Jannat Booking account.</p>
				</div>
				<form className="auth-card premium-card" onSubmit={submit}>
					<div className="auth-card-head">
						<div className="auth-icon">
							<LockKeyhole size={23} />
						</div>
						<div>
							<h2>Reset password</h2>
							<p>Choose a password you have not used before.</p>
						</div>
					</div>
					<label className="auth-field">
						<span>New password</span>
						<input
							className="plain-input"
							type="password"
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							autoComplete="new-password"
							required
						/>
					</label>
					<label className="auth-field">
						<span>Confirm password</span>
						<input
							className="plain-input"
							type="password"
							value={confirmPassword}
							onChange={(event) => setConfirmPassword(event.target.value)}
							autoComplete="new-password"
							required
						/>
					</label>
					{error ? <p className="auth-alert error">{error}</p> : null}
					{message ? <p className="auth-alert success">{message}</p> : null}
					<button className="btn btn-primary auth-submit" type="submit" disabled={busy || !token}>
						{busy ? "Saving..." : "Save password"}
					</button>
					{message ? (
						<Link className="btn btn-ghost auth-submit" href="/signin">
							Sign in
						</Link>
					) : null}
				</form>
			</div>
		</section>
	);
}
