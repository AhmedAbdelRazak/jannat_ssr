"use client";

import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { forgotPasswordJannatClient } from "../lib/api";

const toEnglishDigits = (value = "") =>
	value
		.replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
		.replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));

const normalizeCredential = (value = "") => {
	const normalized = toEnglishDigits(value).trim();
	if (normalized.includes("@")) return normalized.toLowerCase();
	return normalized.replace(/[^\d+]/g, "");
};

export default function PasswordForgotClient() {
	const [emailOrPhone, setEmailOrPhone] = useState("");
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [waLink, setWaLink] = useState("");

	const submit = async (event) => {
		event.preventDefault();
		setBusy(true);
		setMessage("");
		setError("");
		setWaLink("");
		try {
			const response = await forgotPasswordJannatClient({ emailOrPhone });
			setMessage(
				response?.message ||
					"If an account exists, a reset link will be sent to the available channel."
			);
			setWaLink(response?.wa_link || "");
		} catch (err) {
			setError(err.message || "Failed to request password reset.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="auth-page">
			<div className="auth-shell container">
				<div className="auth-copy">
					<p className="eyebrow">Account access</p>
					<h1>Reset your password</h1>
					<p>Enter the email or WhatsApp number connected to your Jannat Booking account.</p>
				</div>
				<form className="auth-card premium-card" onSubmit={submit}>
					<div className="auth-card-head">
						<div className="auth-icon">
							<ShieldCheck size={23} />
						</div>
						<div>
							<h2>Password reset</h2>
							<p>We will send a secure reset link if the account exists.</p>
						</div>
					</div>
					<label className="auth-field">
						<span>Email or WhatsApp number</span>
						<div>
							<Mail size={17} />
							<input
								dir="ltr"
								value={emailOrPhone}
								onChange={(event) =>
									setEmailOrPhone(normalizeCredential(event.target.value))
								}
								placeholder="you@example.com or +966..."
								autoComplete="username"
								required
							/>
						</div>
					</label>
					{error ? <p className="auth-alert error">{error}</p> : null}
					{message ? <p className="auth-alert success">{message}</p> : null}
					<button className="btn btn-primary auth-submit" type="submit" disabled={busy || !emailOrPhone}>
						{busy ? "Requesting..." : "Request reset link"}
					</button>
					{waLink ? (
						<a className="btn btn-ghost auth-submit" href={waLink} target="_blank" rel="noreferrer">
							Open WhatsApp
						</a>
					) : null}
				</form>
			</div>
		</section>
	);
}
