"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App as AntdApp, Button, Checkbox, Form, Input, InputNumber, Select, Spin } from "antd";
import {
	PayPalButtons,
	PayPalCardFieldsForm,
	PayPalCardFieldsProvider,
	PayPalCVVField,
	PayPalExpiryField,
	PayPalNameField,
	PayPalNumberField,
	PayPalScriptProvider,
	usePayPalCardFields,
	usePayPalScriptReducer,
} from "@paypal/react-paypal-js";
import { BedDouble, CalendarDays, CreditCard, Hotel, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackConversion } from "../lib/analyticsEvents";
import { COUNTRY_SELECT_OPTIONS } from "../lib/countries";
import {
	cancelPayPalPendingReservation,
	createPayPalOrder,
	createReservationViaPayPal,
	createUncompleteReservationDocument,
	currencyConversion,
	getPayPalClientToken,
	preparePayPalPendingReservation,
} from "../lib/api";
import {
	cartRoomsCount,
	cartTotal,
	defaultGuestPaymentAcceptance,
	itemTotal,
	legacyDepositAmount,
	safeNumber,
	transformCartToPickedRoomsType,
} from "../lib/booking";
import { cartPackageIssue } from "../lib/dealPolicy.mjs";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const normalizePhoneInput = (value = "") =>
	String(value || "")
		.replace(/[^\d\s+-]/g, "")
		.trim();

const passwordFromPhone = (phone = "") => normalizePhoneInput(phone).replace(/\s+/g, "");

const toMoney = (value) => Number(safeNumber(value, 0).toFixed(2));
const shortSig = (value = "") => {
	const text = String(value || "");
	let hash = 0;
	for (let index = 0; index < text.length; index += 1) {
		hash = (hash * 33 + text.charCodeAt(index)) >>> 0;
	}
	return hash.toString(16);
};
const CARD_FIELDS_READY_ATTEMPTS = 60;
const CARD_FIELDS_READY_INTERVAL_MS = 200;

const APPLE_PAY_SDK_SRC = "https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js";

const readPayPalCardFieldsStatus = () => {
	if (typeof window === "undefined") return "checking";
	const cardFields = window?.paypal?.CardFields;
	if (!cardFields) return "checking";
	if (typeof cardFields.isEligible === "function") {
		try {
			return cardFields.isEligible() ? "ready" : "checking";
		} catch (_error) {
			return "checking";
		}
	}
	return "ready";
};

const canRenderPayPalCardFields = () =>
	typeof window !== "undefined" && Boolean(window?.paypal?.CardFields);

class PayPalCardFieldsErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error) {
		console.warn("PayPal card fields could not render:", error?.message || error);
	}

	componentDidUpdate(previousProps) {
		if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
			this.setState({ hasError: false });
		}
	}

	render() {
		if (this.state.hasError) return this.props.fallback || null;
		return this.props.children;
	}
}

function usePayPalCardFieldsStatus(isResolved, walletOnly, retryKey) {
	const [status, setStatus] = useState("checking");

	useEffect(() => {
		if (!isResolved) {
			setStatus("checking");
			return undefined;
		}
		if (walletOnly) {
			setStatus("unavailable");
			return undefined;
		}

		let cancelled = false;
		let attempts = 0;
		setStatus("checking");

		const check = () => {
			if (cancelled) return;
			const nextStatus = readPayPalCardFieldsStatus();
			if (nextStatus === "ready") {
				setStatus("ready");
				return;
			}
			attempts += 1;
			if (attempts >= CARD_FIELDS_READY_ATTEMPTS) {
				setStatus("unavailable");
				return;
			}
			window.setTimeout(check, CARD_FIELDS_READY_INTERVAL_MS);
		};

		check();
		return () => {
			cancelled = true;
		};
	}, [isResolved, walletOnly, retryKey]);

	return status;
}

const ensureApplePaySdk = () => {
	if (typeof window === "undefined") return Promise.resolve(false);
	if (window.ApplePaySession) return Promise.resolve(true);
	return new Promise((resolve) => {
		const existing = document.querySelector(`script[src="${APPLE_PAY_SDK_SRC}"]`);
		if (existing) {
			let settled = false;
			const finish = (value) => {
				if (settled) return;
				settled = true;
				resolve(value);
			};
			existing.addEventListener("load", () => finish(Boolean(window.ApplePaySession)), { once: true });
			existing.addEventListener("error", () => finish(false), { once: true });
			window.setTimeout(() => finish(Boolean(window.ApplePaySession)), 3000);
			return;
		}
		const script = document.createElement("script");
		script.src = APPLE_PAY_SDK_SRC;
		script.async = true;
		script.setAttribute("data-apple-pay-sdk", "true");
		script.onload = () => resolve(Boolean(window.ApplePaySession));
		script.onerror = () => resolve(false);
		document.head.appendChild(script);
	});
};

const truncatePayPalText = (value, max = 127) => {
	const text = String(value || "");
	if (text.length <= max) return text;
	return `${text.slice(0, Math.max(0, max - 3))}...`;
};

const buildPayPalInvoiceId = (confirmation = "") =>
	`Jannat-${confirmation || "reservation"}-${Date.now().toString(36).slice(-6)}`.slice(0, 127);

const PAYPAL_PENDING_REVIEW_CODE = "PAYPAL_CAPTURE_PENDING_REVIEW";

const getPayPalMetadataId = () => {
	try {
		return window?.paypal?.getClientMetadataID?.() || null;
	} catch (_error) {
		return null;
	}
};

const isPayPalPendingReviewPayload = (payload) =>
	Boolean(
		payload?.paypalPendingReview ||
			payload?.pendingReview ||
			payload?.code === PAYPAL_PENDING_REVIEW_CODE
	);

const pendingReviewCopy = (isArabic) => ({
	title: isArabic
		? "\u0627\u0644\u062f\u0641\u0639 \u0642\u064a\u062f \u0645\u0631\u0627\u062c\u0639\u0629 PayPal"
		: "Payment Is Under PayPal Review",
	description: isArabic
		? "\u0644\u0645 \u064a\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u062c\u0632 \u0623\u0648 \u062a\u0633\u062c\u064a\u0644\u0647 \u0643\u0645\u062f\u0641\u0648\u0639 \u0628\u0639\u062f. \u064a\u0631\u062c\u0649 \u0639\u062f\u0645 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062f\u0641\u0639. \u0633\u064a\u062a\u0627\u0628\u0639 \u0641\u0631\u064a\u0642 \u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u062c \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u064a\u0624\u0643\u062f \u0644\u0643 \u0628\u0645\u062c\u0631\u062f \u0627\u0643\u062a\u0645\u0627\u0644\u0647\u0627."
		: "The reservation is not confirmed as paid yet. Please do not retry or submit another payment. Jannat Booking will follow this PayPal review and confirm once it is completed.",
});

const paypalErrorMessage = (error, isArabic, fallbackType = "payment") => {
	const raw = String(error?.response?.message || error?.message || error?.name || "").trim();
	const normalized = raw.toUpperCase();
	if (isPayPalPendingReviewPayload(error?.response || error)) {
		return pendingReviewCopy(isArabic).description;
	}
	if (normalized.includes("INSTRUMENT_DECLINED") || normalized.includes("DECLINED")) {
		return isArabic
			? "\u062a\u0645 \u0631\u0641\u0636 \u0648\u0633\u064a\u0644\u0629 \u0627\u0644\u062f\u0641\u0639. \u064a\u0631\u062c\u0649 \u062a\u062c\u0631\u0628\u0629 \u0628\u0637\u0627\u0642\u0629 \u0623\u062e\u0631\u0649 \u0623\u0648 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0628\u0646\u0643."
			: "The payment method was declined. Please try another card or contact your bank.";
	}
	if (normalized.includes("CARD_FIELDS") || normalized.includes("HOSTED_FIELDS")) {
		return isArabic
			? "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u062d\u0642\u0648\u0644 \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0622\u0645\u0646\u0629. \u064a\u0631\u062c\u0649 \u062a\u062c\u0631\u0628\u0629 \u0632\u0631 PayPal \u0623\u0648 \u0625\u064a\u0642\u0627\u0641 \u0645\u0627\u0646\u0639 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0648\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629."
			: "Secure card fields could not load. Please try the PayPal/card button above, or disable ad blockers and try again.";
	}
	if (normalized.includes("NETWORK") || normalized.includes("LOAD") || normalized.includes("SCRIPT")) {
		return isArabic
			? "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062f\u0641\u0639. \u064a\u0631\u062c\u0649 \u0641\u062d\u0635 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0623\u0648 \u062a\u0639\u0637\u064a\u0644 \u0645\u0627\u0646\u0639 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0623\u0648 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649."
			: "The payment module could not load. Please check your connection, disable ad blockers, or try again.";
	}
	if (raw && raw.length <= 180 && !/^Error$/i.test(raw)) return raw;
	if (fallbackType === "card") {
		return isArabic
			? "\u062a\u0639\u0630\u0631 \u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u062f\u0641\u0639 \u0628\u0627\u0644\u0628\u0637\u0627\u0642\u0629. \u064a\u0631\u062c\u0649 \u0645\u0631\u0627\u062c\u0639\u0629 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0623\u0648 \u062a\u062c\u0631\u0628\u0629 \u0628\u0637\u0627\u0642\u0629 \u0623\u062e\u0631\u0649."
			: "Card payment could not be completed. Please check the card details or try another card.";
	}
	return isArabic
		? "\u062a\u0639\u0630\u0631 \u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u062f\u0641\u0639. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649 \u0623\u0648 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u062f\u0639\u0645 \u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u062c."
		: "Payment could not be completed. Please try again or contact Jannat Booking support.";
};

const optionLabel = (option) => {
	if (option === "deposit") return "Deposit Paid";
	if (option === "full") return "Paid Online";
	return "Not Paid";
};

const filterCountryOption = (input = "", option = {}) =>
	`${option.label || ""} ${option.value || ""}`.toLowerCase().includes(input.toLowerCase());

const checkoutQueryFields = Object.freeze({
	fullName: "fullName",
	phone: "phone",
	email: "email",
	nationality: "nationality",
});

const checkoutQueryAliases = Object.freeze({
	fullName: ["fullName", "name"],
	phone: ["phone"],
	email: ["email"],
	nationality: ["nationality"],
});

const checkoutQueryLimits = Object.freeze({
	fullName: 120,
	phone: 40,
	email: 160,
	nationality: 2,
});

const normalizeCheckoutQueryValue = (field, value = "") => {
	const rawValue = String(value || "").trim();
	if (field === "nationality") {
		const countryCode = rawValue.toUpperCase();
		if (/^[A-Z]{2}$/.test(countryCode)) return countryCode;
		const countryMatch = COUNTRY_SELECT_OPTIONS.find((country) => country.label.toLowerCase() === rawValue.toLowerCase());
		return countryMatch?.value || "";
	}

	const normalized =
		field === "phone"
			? normalizePhoneInput(rawValue)
			: field === "email"
				? rawValue.toLowerCase()
				: rawValue.replace(/\s+/g, " ");
	return normalized.slice(0, checkoutQueryLimits[field] || 160);
};

const checkoutValuesFromQuery = () => {
	if (typeof window === "undefined") return {};
	const params = new URLSearchParams(window.location.search);
	return Object.entries(checkoutQueryAliases).reduce((values, [field, aliases]) => {
		const value = aliases.map((key) => params.get(key)).find((entry) => entry !== null);
		const normalized = normalizeCheckoutQueryValue(field, value || "");
		if (normalized) values[field] = normalized;
		return values;
	}, {});
};

const CHECKOUT_VALIDATION_MESSAGE_KEY = "checkout-validation";
const checkoutFormIssueFields = new Set(["fullName", "phone", "email", "nationality"]);
const checkoutIssueSelectors = {
	fullName: "#checkout-full-name",
	phone: "#checkout-phone",
	email: "#checkout-email",
	nationality: ".checkout-nationality-select .ant-select-selector",
	paymentOption: '[data-checkout-field="paymentOption"]',
	terms: '[data-checkout-field="terms"]',
	cart: ".checkout-summary",
	hotel: ".checkout-summary",
	package: ".checkout-summary",
	mixedPackageCart: ".checkout-summary",
	mixedPackageDates: ".checkout-summary",
};

const checkoutValidationMessage = (field, isArabic) => {
	const messages = {
		cart: isArabic ? "السلة فارغة." : "Your cart is empty.",
		hotel: isArabic
			? "يرجى حجز غرف من فندق واحد فقط في كل طلب."
			: "Please book rooms from one hotel per reservation.",
		package: isArabic
			? "هذه الباقة لم تعد متاحة. يرجى إزالتها واختيار عرض قادم."
			: "A full-stay package in your cart is no longer available. Remove it and choose an upcoming offer.",
		mixedPackageCart: isArabic
			? "يرجى إتمام الباقات كاملة المدة والغرف العادية في حجوزات منفصلة."
			: "Full-stay packages and standard rooms must be checked out separately.",
		mixedPackageDates: isArabic
			? "يرجى إتمام كل نافذة تواريخ للباقات في حجز منفصل."
			: "Full-stay packages with different date windows must be checked out separately.",
		paymentOption: isArabic ? "يرجى اختيار طريقة الدفع." : "Please choose how you would like to pay.",
		terms: isArabic ? "يرجى الموافقة على الشروط والأحكام." : "Please accept the Terms & Conditions.",
		fullName: isArabic ? "يرجى كتابة الاسم الكامل." : "Please enter your full name, first and last name.",
		phone: isArabic ? "يرجى كتابة رقم جوال صحيح." : "Please enter a valid phone number.",
		email: isArabic ? "يرجى كتابة بريد إلكتروني صحيح." : "Please enter a valid email address.",
		nationality: isArabic ? "يرجى اختيار الجنسية." : "Please select your nationality.",
	};
	return messages[field] || (isArabic ? "يرجى مراجعة بيانات الحجز." : "Please review your booking details.");
};

const isCheckoutFormIssueResolved = (field, values = {}) => {
	if (field === "fullName") {
		const name = String(values.fullName || "").trim();
		return name.split(/\s+/).filter(Boolean).length >= 2;
	}
	if (field === "phone") {
		return /^\+?[0-9\s-]{5,}$/.test(normalizePhoneInput(values.phone));
	}
	if (field === "email") {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email || "").trim().toLowerCase());
	}
	if (field === "nationality") {
		return Boolean(String(values.nationality || "").trim());
	}
	return false;
};

const focusCheckoutIssue = (field) => {
	if (typeof window === "undefined") return;
	window.requestAnimationFrame(() => {
		const element = document.querySelector(checkoutIssueSelectors[field] || `[data-checkout-field="${field}"]`);
		if (!element) return;
		element.scrollIntoView({ behavior: "smooth", block: "center" });
		const focusTarget =
			element.matches?.("input, textarea, button, [tabindex]") ||
			element.getAttribute?.("role") === "button"
				? element
				: element.querySelector?.("input, textarea, button, [tabindex], .ant-select-selector");
		focusTarget?.focus?.({ preventScroll: true });
	});
};

function PaymentAmountBreakdown({
	sarAmount,
	usdAmount,
	selectedCurrency = "sar",
	formatCurrency,
	isArabic,
	compact = false,
}) {
	const showSelectedCurrency = selectedCurrency !== "sar" && typeof formatCurrency === "function";
	const usdValue = Number(usdAmount || 0);
	return (
		<span className={`payment-amount-breakdown${compact ? " compact" : ""}`} dir="ltr">
			{showSelectedCurrency ? (
				<span className="payment-amount-primary">
					<strong>{formatCurrency(sarAmount)}</strong>
					<em>{isArabic ? "عملة الضيف" : "Guest currency"}</em>
				</span>
			) : null}
			<span className={showSelectedCurrency ? "payment-amount-ledger" : "payment-amount-primary"}>
				<strong>SAR {toMoney(sarAmount).toFixed(2)}</strong>
				<em>{isArabic ? "مبلغ الحجز" : "Reservation amount"}</em>
			</span>
			<span className="payment-amount-paypal">
				<strong>{usdValue > 0 ? `USD ${toMoney(usdValue).toFixed(2)}` : "USD pending"}</strong>
				<em>{isArabic ? "خصم PayPal" : "PayPal charge"}</em>
			</span>
		</span>
	);
}

function PaymentOptions({
	acceptance = defaultGuestPaymentAcceptance,
	selected,
	setSelected,
	totalSar,
	totalUsd,
	isArabic,
	onTouched,
	hasError = false,
	selectedCurrency = "sar",
	formatCurrency,
}) {
	const rows = [
		{
			key: "acceptDeposit",
			title: isArabic ? "دفع العربون أونلاين (15%)" : "Accept Deposit Online (15%)",
			sarAmount: totalSar * 0.15,
			usdAmount: totalUsd * 0.15,
			enabled: acceptance.acceptDeposit !== false,
		},
		{
			key: "acceptPayWholeAmount",
			title: isArabic ? "دفع مبلغ الحجز بالكامل أونلاين" : "Pay Whole Amount Online",
			sarAmount: totalSar,
			usdAmount: totalUsd,
			enabled: acceptance.acceptPayWholeAmount !== false,
		},
		{
			key: "acceptReserveNowPayInHotel",
			title: isArabic ? "احجز الآن وادفع في الفندق" : "Reserve Now, Pay in Hotel",
			sarAmount: totalSar * 1.1,
			usdAmount: totalUsd * 1.1,
			enabled: acceptance.acceptReserveNowPayInHotel === true,
		},
	].filter((row) => row.enabled);

	if (!rows.length) {
		rows.push({
			key: "acceptDeposit",
			title: isArabic ? "دفع العربون أونلاين (15%)" : "Accept Deposit Online (15%)",
			sarAmount: totalSar * 0.15,
			usdAmount: totalUsd * 0.15,
			enabled: true,
		});
	}

	return (
		<div
			className={`payment-options${hasError ? " checkout-field-attention" : ""}`}
			data-checkout-field="paymentOption"
		>
			<h3>{isArabic ? "طريقة الدفع" : "Payment Option"}</h3>
			{rows.map((row) => (
				<button
					type="button"
					key={row.key}
					className={selected === row.key ? "selected" : ""}
					onClick={() => {
						setSelected(row.key);
						onTouched?.(`User Selected ${row.key}`);
					}}
				>
					<span className="radio-dot" />
					<span>
				<strong>{row.title}</strong>
				<PaymentAmountBreakdown
					sarAmount={row.sarAmount}
					usdAmount={row.usdAmount}
					selectedCurrency={selectedCurrency}
					formatCurrency={formatCurrency}
					isArabic={isArabic}
				/>
					</span>
				</button>
			))}
		</div>
	);
}

function PayPalStatus() {
	const [{ isPending }] = usePayPalScriptReducer();
	return isPending ? (
		<div className="paypal-loading">
			<Spin />
		</div>
	) : null;
}

function CardFieldsSubmitButton({ allowInteract, labels, onBeforeSubmit, shouldSuppressError }) {
	const { message } = AntdApp.useApp();
	const cardFieldsContext = usePayPalCardFields();
	const cardFieldsForm = cardFieldsContext?.cardFieldsForm;
	const cardFields = cardFieldsContext?.cardFields;
	const [busy, setBusy] = useState(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let cancelled = false;
		let tries = 0;
		const checkReady = () => {
			if (cancelled) return;
			const submitFn =
				(cardFieldsForm && cardFieldsForm.submit) ||
				(cardFields && cardFields.submit) ||
				null;
			const eligible =
				(cardFieldsForm?.isEligible?.() ?? true) &&
				(cardFields?.isEligible?.() ?? true);
			setReady(typeof submitFn === "function" && eligible);
			if ((!submitFn || !eligible) && tries < 60) {
				tries += 1;
				window.setTimeout(checkReady, 250);
			}
		};
		checkReady();
		return () => {
			cancelled = true;
		};
	}, [cardFieldsForm, cardFields]);

	const submit = async () => {
		const submitFn =
			(cardFieldsForm && cardFieldsForm.submit) ||
			(cardFields && cardFields.submit) ||
			null;
		if (!allowInteract || typeof submitFn !== "function") return;
		setBusy(true);
		try {
			if (onBeforeSubmit && !onBeforeSubmit()) {
				return;
			}
			if (cardFieldsForm?.getState) {
				const state = await cardFieldsForm.getState();
				if (state && !state.isFormValid) {
					message.open({
						key: "paypal-card-fields-validation",
						type: "error",
						content: labels.incomplete,
						duration: 4,
					});
					setBusy(false);
					return;
				}
			}
			await submitFn();
		} catch (error) {
			if (error?.silent || shouldSuppressError?.(error)) return;
			console.error("PayPal card fields submit failed:", error);
			message.open({
				key: "paypal-card-fields-validation",
				type: "error",
				content: labels.failed,
				duration: 4,
			});
		} finally {
			setBusy(false);
		}
	};

	const disabled = !allowInteract || !ready || busy;
	return (
		<button
			type="button"
			className="paypal-card-submit"
			onClick={submit}
			disabled={disabled}
			aria-disabled={disabled}
		>
			{busy ? labels.processing : labels.pay}
		</button>
	);
}

function ApplePayCheckoutButton({
	allowInteract,
	isArabic,
	selectedPaymentOption,
	selectedUsdAmount,
	selectedSarAmount,
	createApplePayOrder,
	onApplePayApproved,
	onBeforeStart,
	chargeLabel,
}) {
	const { message } = AntdApp.useApp();
	const [{ isResolved }] = usePayPalScriptReducer();
	const [applepayConfig, setApplepayConfig] = useState(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const boot = async () => {
			if (!isResolved) return;
			if (
				!window.ApplePaySession ||
				(typeof window.ApplePaySession.canMakePayments === "function" &&
					!window.ApplePaySession.canMakePayments())
			) {
				if (!cancelled) setApplepayConfig(null);
				return;
			}
			await ensureApplePaySdk();
			if (!window.ApplePaySession || !window.paypal?.Applepay) {
				if (!cancelled) setApplepayConfig(null);
				return;
			}
			try {
				const config = await window.paypal.Applepay().config();
				if (!cancelled) setApplepayConfig(config?.isEligible ? config : null);
			} catch (_error) {
				if (!cancelled) setApplepayConfig(null);
			}
		};
		boot();
		return () => {
			cancelled = true;
		};
	}, [isResolved]);

	const startApplePay = async () => {
		if (onBeforeStart && !onBeforeStart()) return;
		if (!allowInteract || !selectedPaymentOption) {
			message.error(isArabic ? "\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u062e\u064a\u0627\u0631 \u062f\u0641\u0639 \u0635\u062d\u064a\u062d \u0623\u0648\u0644\u0627." : "Please choose a valid payment option first.");
			return;
		}
		if (!window.ApplePaySession || !window.paypal?.Applepay || !applepayConfig?.isEligible) {
			message.error(isArabic ? "\u062e\u064a\u0627\u0631 Apple Pay \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062c\u0647\u0627\u0632 \u0623\u0648 \u0627\u0644\u0645\u062a\u0635\u0641\u062d." : "Apple Pay is not available on this device or browser.");
			return;
		}
		const amountUsd = Number(selectedUsdAmount || 0).toFixed(2);
		if (!(Number(amountUsd) > 0)) {
			message.error(isArabic ? "\u0645\u0628\u0644\u063a \u0627\u0644\u062f\u0641\u0639 \u063a\u064a\u0631 \u062c\u0627\u0647\u0632 \u0628\u0639\u062f." : "The payment amount is not ready yet.");
			return;
		}

		const applepay = window.paypal.Applepay();
		const session = new window.ApplePaySession(4, {
			countryCode: applepayConfig.countryCode || "US",
			currencyCode: "USD",
			merchantCapabilities: applepayConfig.merchantCapabilities,
			supportedNetworks: applepayConfig.supportedNetworks,
			total: {
				label: "Jannat Booking",
				type: "final",
				amount: amountUsd,
			},
		});

		session.onvalidatemerchant = async (event) => {
			try {
				const validateResult = await applepay.validateMerchant({
					validationUrl: event.validationURL,
					displayName: "Jannat Booking",
				});
				session.completeMerchantValidation(validateResult.merchantSession);
			} catch (error) {
				session.abort();
				message.error(paypalErrorMessage(error, isArabic));
			}
		};

		session.onpaymentauthorized = async (event) => {
			setLoading(true);
			try {
				const orderId = await createApplePayOrder();
				await applepay.confirmOrder({
					orderId,
					token: event.payment.token,
					billingContact: event.payment.billingContact,
				});
				await onApplePayApproved({ orderID: orderId });
				session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
			} catch (error) {
				session.completePayment(window.ApplePaySession.STATUS_FAILURE);
				message.error(paypalErrorMessage(error, isArabic));
			} finally {
				setLoading(false);
			}
		};

		session.begin();
	};

	if (!isResolved || !applepayConfig?.isEligible) return null;

	return (
		<div className="apple-pay-section">
			<button
				type="button"
				className="apple-pay-fallback"
				onClick={startApplePay}
				disabled={!allowInteract || loading}
				aria-label={isArabic ? "\u0627\u0644\u062f\u0641\u0639 \u0628\u0648\u0627\u0633\u0637\u0629 Apple Pay" : "Pay with Apple Pay"}
			>
				<apple-pay-button buttonstyle="black" type="buy" locale="en" />
			</button>
			<span>
				{isArabic ? "\u0645\u062f\u0639\u0648\u0645 \u0645\u0646" : "Powered by"} <b>PayPal</b>
				<span dir="ltr" className="ltr-value"> {chargeLabel || `SAR ${Number(selectedSarAmount || 0).toFixed(2)} / USD ${Number(selectedUsdAmount || 0).toFixed(2)}`}</span>
			</span>
		</div>
	);
}

function JannatPayPalButtons({
	canPay,
	isArabic,
	selectedPaymentOption,
	convertedAmounts,
	totalSar,
	guestAgreed,
	getPendingReservationPayload,
	onPayApproved,
	onTouched,
	walletOnly = false,
	onUseWalletOnly,
	onReloadPayment,
	onValidationError,
	onPaymentPendingReview,
	selectedCurrency = "sar",
	formatCurrency,
}) {
	const { message } = AntdApp.useApp();
	const [{ isResolved, isRejected }] = usePayPalScriptReducer();
	const selectedUsdAmount =
		selectedPaymentOption === "acceptDeposit"
			? toMoney(safeNumber(convertedAmounts.totalUSD, 0) * 0.15)
			: selectedPaymentOption === "acceptPayWholeAmount"
				? toMoney(convertedAmounts.totalUSD)
				: 0;
	const selectedSarAmount =
		selectedPaymentOption === "acceptDeposit"
			? toMoney(totalSar * 0.15)
			: selectedPaymentOption === "acceptPayWholeAmount"
				? toMoney(totalSar)
				: 0;
	const cardFieldsStatus = usePayPalCardFieldsStatus(
		isResolved,
		walletOnly,
		`${selectedPaymentOption || "option"}-${selectedUsdAmount}`
	);
	const pendingRef = useRef({
		pendingReservationId: null,
		confirmation_number: null,
		invoice_id: null,
		payload: null,
	});
	const suppressPaymentErrorUntilRef = useRef(0);

	const allowInteract = canPay && selectedUsdAmount > 0 && selectedSarAmount > 0;
	const buttonsForceReRender = useMemo(
		() => [
			selectedPaymentOption || "none",
			String(selectedUsdAmount),
			String(selectedSarAmount),
			walletOnly ? "wallet" : "full",
		],
		[selectedPaymentOption, selectedSarAmount, selectedUsdAmount, walletOnly]
	);
	const selectedCurrencyAmount =
		selectedCurrency !== "sar" && typeof formatCurrency === "function"
			? formatCurrency(selectedSarAmount)
			: "";
	const payButtonAmountLabel = selectedCurrencyAmount || `SAR ${selectedSarAmount.toFixed(2)}`;
	const payPalChargeNode = (
		<PaymentAmountBreakdown
			sarAmount={selectedSarAmount}
			usdAmount={selectedUsdAmount}
			selectedCurrency={selectedCurrency}
			formatCurrency={formatCurrency}
			isArabic={isArabic}
			compact
		/>
	);
	const trackPaymentAttempt = (paymentSurface, pending = {}) => {
		trackConversion(
			"paymentClick",
			{
				transaction_id: pending.confirmation_number || undefined,
				payment_type:
					selectedPaymentOption === "acceptDeposit" ? "deposit" : "full",
				payment_surface: paymentSurface,
				checkout_context: "cart_checkout",
				value: selectedSarAmount,
				currency: "SAR",
			},
			["Payment Button Clicked"]
		);
	};
	const suppressNextPaymentError = () => {
		suppressPaymentErrorUntilRef.current = Date.now() + 4000;
	};
	const shouldSuppressPaymentError = (error) =>
		Boolean(error?.silent || Date.now() < suppressPaymentErrorUntilRef.current);
	const reportValidationError = (field, fallback) => {
		if (onValidationError) {
			onValidationError(field, fallback);
			return;
		}
		message.open({
			key: CHECKOUT_VALIDATION_MESSAGE_KEY,
			type: "error",
			content: fallback || checkoutValidationMessage(field, isArabic),
			duration: 4,
		});
	};

	const cancelPending = useCallback(async () => {
		const pendingReservationId = pendingRef.current?.pendingReservationId;
		const confirmation_number = pendingRef.current?.confirmation_number;
		if (!pendingReservationId && !confirmation_number) return;
		try {
			await cancelPayPalPendingReservation({ pendingReservationId, confirmation_number });
		} catch (error) {
			console.warn("Pending reservation cancel failed:", error?.message || error);
		} finally {
			pendingRef.current = {
				pendingReservationId: null,
				confirmation_number: null,
				invoice_id: null,
				payload: null,
			};
		}
	}, []);

	const handlePendingReview = useCallback(
		(payload) => {
			const reviewPayload = payload?.response || payload || {};
			pendingRef.current = {
				pendingReservationId: null,
				confirmation_number: null,
				invoice_id: null,
				payload: null,
			};
			onPaymentPendingReview?.(reviewPayload);
			message.open({
				key: "checkout-payment-review",
				type: "warning",
				content: pendingReviewCopy(isArabic).description,
				duration: 8,
			});
		},
		[isArabic, message, onPaymentPendingReview]
	);

	useEffect(() => () => cancelPending(), [cancelPending]);

	const ensurePendingReservation = async () => {
		if (pendingRef.current.pendingReservationId && pendingRef.current.confirmation_number) {
			return pendingRef.current;
		}
		const payload = getPendingReservationPayload?.();
		if (!payload) {
			suppressNextPaymentError();
			const err = new Error("");
			err.silent = true;
			throw err;
		}
		const response = await preparePayPalPendingReservation(payload);
		const pendingReservationId = response?.pendingReservationId || response?.tempReservationId || response?.id;
		const confirmation_number = response?.confirmation_number;
		if (!pendingReservationId || !confirmation_number) {
			throw new Error("Failed to prepare pending reservation.");
		}
		pendingRef.current = {
			pendingReservationId,
			confirmation_number,
			invoice_id: buildPayPalInvoiceId(confirmation_number),
			payload,
		};
		return pendingRef.current;
	};

	const validateBeforePay = () => {
		if (!guestAgreed) {
			reportValidationError("terms", checkoutValidationMessage("terms", isArabic));
			return false;
		}
		if (!allowInteract) {
			reportValidationError("paymentOption", checkoutValidationMessage("paymentOption", isArabic));
			return false;
		}
		if (!guestAgreed) {
			message.error(isArabic ? "يرجى الموافقة على الشروط والأحكام أولا." : "Please accept the Terms & Conditions first.");
			return false;
		}
		if (!allowInteract) {
			message.error(isArabic ? "يرجى اختيار خيار دفع صحيح." : "Please choose a valid payment option.");
			return false;
		}
		return true;
	};

	const validateCardSubmitReadiness = () => {
		if (!validateBeforePay()) {
			suppressNextPaymentError();
			return false;
		}
		const payload = getPendingReservationPayload?.();
		if (!payload) {
			suppressNextPaymentError();
			return false;
		}
		return true;
	};

	const handlePaymentButtonClick = (_data, actions) => {
		if (!validateCardSubmitReadiness()) {
			return actions?.reject ? actions.reject() : false;
		}
		return actions?.resolve ? actions.resolve() : true;
	};

	const buildPurchaseUnits = (label, pending) => {
		const payload = pending?.payload || {};
		const guest = payload.customerDetails || payload.customer_details || {};
		const confirmation = pending?.confirmation_number || "";
		const hotelName = payload.hotelName || payload.hotel_name || "Jannat Booking";
		const checkin = payload.checkin_date || "";
		const checkout = payload.checkout_date || "";
		const guestName = guest.name || "Guest";
		const invoiceId = pending.invoice_id || buildPayPalInvoiceId(confirmation);
		return [
			{
				reference_id: "default",
				invoice_id: invoiceId,
				custom_id: confirmation,
				description: truncatePayPalText(
					`Jannat Booking reservation - ${hotelName} - ${label} - ${checkin} to ${checkout} - ${guestName}`
				),
				amount: {
					currency_code: "USD",
					value: selectedUsdAmount.toFixed(2),
					breakdown: {
						item_total: {
							currency_code: "USD",
							value: selectedUsdAmount.toFixed(2),
						},
					},
				},
				items: [
					{
						name: truncatePayPalText(`${hotelName} - ${label}`),
						description: truncatePayPalText(
							`Guest: ${guestName}, Phone: ${guest.phone || "n/a"}, Email: ${guest.email || "n/a"}, Conf: ${confirmation}`
						),
						quantity: "1",
						unit_amount: {
							currency_code: "USD",
							value: selectedUsdAmount.toFixed(2),
						},
						category: "DIGITAL_GOODS",
						sku: confirmation ? `CNF-${confirmation}` : undefined,
					},
				],
			},
		];
	};

	const createOrder = async (_data, actions) => {
		if (!validateBeforePay()) {
			suppressNextPaymentError();
			const err = new Error("");
			err.silent = true;
			throw err;
		}
		onTouched?.("PayPal createOrder");
		const pending = await ensurePendingReservation();
		const optionText =
			selectedPaymentOption === "acceptDeposit"
				? isArabic
					? "عربون 15%"
					: "Deposit 15%"
				: isArabic
					? "المبلغ الكامل"
					: "Full amount";
		pending.invoice_id = pending.invoice_id || buildPayPalInvoiceId(pending.confirmation_number);
		pendingRef.current.invoice_id = pending.invoice_id;
		trackPaymentAttempt("paypal_card_button", pending);
		const orderPayload = {
			intent: "CAPTURE",
			purchase_units: buildPurchaseUnits(optionText, pending),
			application_context: {
				user_action: "PAY_NOW",
				shipping_preference: "NO_SHIPPING",
				brand_name: "Jannat Booking",
			},
		};
		if (actions?.order?.create) {
			return actions.order.create(orderPayload);
		}
		const serverOrder = await createPayPalOrder({
			...orderPayload,
			payment_source: {
				card: { attributes: { vault: { store_in_vault: "ON_SUCCESS" } } },
			},
		});
		if (!serverOrder?.id) {
			throw new Error(
				isArabic
					? "\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 \u0627\u0644\u062f\u0641\u0639 \u0644\u0644\u0628\u0637\u0627\u0642\u0629."
					: "Could not create a secure card payment order."
			);
		}
		return serverOrder.id;
	};

	const createApplePayOrder = async () => {
		if (!validateBeforePay()) {
			suppressNextPaymentError();
			const err = new Error("");
			err.silent = true;
			throw err;
		}
		onTouched?.("Apple Pay createOrder");
		const pending = await ensurePendingReservation();
		const optionText =
			selectedPaymentOption === "acceptDeposit"
				? "Deposit 15%"
				: "Full amount";
		pending.invoice_id = pending.invoice_id || buildPayPalInvoiceId(pending.confirmation_number);
		pendingRef.current.invoice_id = pending.invoice_id;
		trackPaymentAttempt("apple_pay", pending);
		const serverOrder = await createPayPalOrder({
			intent: "CAPTURE",
			purchase_units: buildPurchaseUnits(optionText, pending),
			application_context: {
				user_action: "PAY_NOW",
				shipping_preference: "NO_SHIPPING",
				brand_name: "Jannat Booking",
			},
		});
		if (!serverOrder?.id) {
			throw new Error(isArabic ? "\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0637\u0644\u0628 Apple Pay." : "Could not create an Apple Pay payment order.");
		}
		return serverOrder.id;
	};

	const onApprove = async (data) => {
		try {
			const option = selectedPaymentOption === "acceptDeposit" ? "deposit" : "full";
			await onPayApproved({
				option,
				convertedAmounts,
				sarAmount: selectedSarAmount.toFixed(2),
				pendingReservationId: pendingRef.current?.pendingReservationId || null,
				confirmation_number: pendingRef.current?.confirmation_number || null,
				paypal: {
					order_id: data?.orderID || data?.orderId || data?.id,
					expectedUsdAmount: selectedUsdAmount.toFixed(2),
					cmid: getPayPalMetadataId(),
					mode: "capture",
					invoice_id: pendingRef.current?.invoice_id || null,
				},
			});
			pendingRef.current = {
				pendingReservationId: null,
				confirmation_number: null,
				invoice_id: null,
				payload: null,
			};
		} catch (error) {
			if (isPayPalPendingReviewPayload(error?.response || error)) {
				handlePendingReview(error?.response || error);
				return;
			}
			await cancelPending();
			message.error(error?.message || (isArabic ? "تعذر إتمام الدفع." : "Payment could not be completed."));
		}
	};

	if (!allowInteract) return null;

	if (isRejected) {
		return (
			<div className="paypal-box">
				<Alert
					type="error"
					showIcon
					title={isArabic ? "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062f\u0641\u0639" : "Payment module could not load"}
					description={
						isArabic
							? "\u064a\u0631\u062c\u0649 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629. \u0625\u0630\u0627 \u0627\u0633\u062a\u0645\u0631\u062a \u0627\u0644\u0645\u0634\u0643\u0644\u0629\u060c \u0639\u0637\u0644 \u0645\u0627\u0646\u0639 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0623\u0648 \u062c\u0631\u0628 \u0634\u0628\u0643\u0629 \u0645\u062e\u062a\u0644\u0641\u0629."
							: "Please try again. If this continues, disable ad blockers or try a different network."
					}
				/>
				<div className="paypal-recovery-actions">
					{!walletOnly ? (
						<Button type="primary" onClick={onUseWalletOnly}>
							{isArabic ? "\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0628\u0623\u0632\u0631\u0627\u0631 PayPal \u0641\u0642\u0637" : "Continue with PayPal buttons only"}
						</Button>
					) : null}
					<Button onClick={onReloadPayment}>
						{isArabic ? "\u0625\u0639\u0627\u062f\u0629 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062f\u0641\u0639" : "Reload payment"}
					</Button>
				</div>
			</div>
		);
	}

	const cardFieldsUnavailableAlert = (
		<Alert
			type="info"
			showIcon
			className="paypal-card-fields-unavailable"
			message={isArabic ? "\u0627\u0644\u062f\u0641\u0639 \u062f\u0627\u062e\u0644 \u0627\u0644\u0635\u0641\u062d\u0629 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u0644\u0647\u0630\u0647 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629" : "Inline card fields are not available for this attempt"}
			description={
				isArabic
					? "\u064a\u0631\u062c\u0649 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0632\u0631 \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u062f\u0641\u0639 \u0623\u0639\u0644\u0627\u0647. \u0642\u062f \u064a\u062e\u062a\u0644\u0641 \u0638\u0647\u0648\u0631 \u062d\u0642\u0648\u0644 \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u062d\u0633\u0628 \u0625\u0639\u062f\u0627\u062f\u0627\u062a PayPal\u060c \u0627\u0644\u0628\u0644\u062f\u060c \u0623\u0648 \u0627\u0644\u0645\u062a\u0635\u0641\u062d."
					: "Please use the card payment button above. Card-field availability can vary by PayPal account, country, browser, or live configuration."
			}
		/>
	);
	const inlineCardFieldsReady = cardFieldsStatus === "ready" && canRenderPayPalCardFields();
	const cardFieldsResetKey = `${buttonsForceReRender.join("|")}-${cardFieldsStatus}`;

	return (
		<div className="paypal-box">
			<div className="amount-bar">
				<span>{isArabic ? "ستدفع الآن" : "You will pay now"}</span>
				{payPalChargeNode}
			</div>
			<PayPalStatus />
			<PayPalButtons
				fundingSource="paypal"
				style={{ layout: "vertical", label: "paypal" }}
				forceReRender={buttonsForceReRender}
				onClick={handlePaymentButtonClick}
				createOrder={createOrder}
				onApprove={onApprove}
				onCancel={cancelPending}
				onError={async (error) => {
					if (isPayPalPendingReviewPayload(error?.response || error)) {
						handlePendingReview(error?.response || error);
						return;
					}
					await cancelPending();
					if (!shouldSuppressPaymentError(error)) {
						message.open({
							key: "checkout-payment-error",
							type: "error",
							content: paypalErrorMessage(error, isArabic),
							duration: 4,
						});
					}
				}}
				disabled={!allowInteract}
			/>
			<PayPalButtons
				fundingSource="card"
				style={{ layout: "vertical", label: "pay" }}
				forceReRender={buttonsForceReRender}
				onClick={handlePaymentButtonClick}
				createOrder={createOrder}
				onApprove={onApprove}
				onCancel={cancelPending}
				onError={async (error) => {
					if (isPayPalPendingReviewPayload(error?.response || error)) {
						handlePendingReview(error?.response || error);
						return;
					}
					await cancelPending();
					if (!shouldSuppressPaymentError(error)) {
						message.open({
							key: "checkout-payment-error",
							type: "error",
							content: paypalErrorMessage(error, isArabic, "card"),
							duration: 4,
						});
					}
				}}
				disabled={!allowInteract}
			/>
			<div className="paypal-powered-note">
				{isArabic ? "\u0645\u062f\u0639\u0648\u0645 \u0645\u0646" : "Powered by"} <b>PayPal</b>
			</div>
			<ApplePayCheckoutButton
				allowInteract={allowInteract}
				isArabic={isArabic}
				selectedPaymentOption={selectedPaymentOption}
				selectedUsdAmount={selectedUsdAmount}
				selectedSarAmount={selectedSarAmount}
				createApplePayOrder={createApplePayOrder}
				onApplePayApproved={onApprove}
				onBeforeStart={validateCardSubmitReadiness}
				chargeLabel={payPalChargeNode}
			/>
			{isResolved && !walletOnly ? (
				inlineCardFieldsReady ? (
					<div className="paypal-card-fields-panel" dir={isArabic ? "rtl" : "ltr"}>
						<div className="paypal-card-fields-head">
							<CreditCard size={18} />
							<div>
								<strong>{isArabic ? "\u0627\u062f\u0641\u0639 \u0645\u0628\u0627\u0634\u0631\u0629 \u0628\u0627\u0644\u0628\u0637\u0627\u0642\u0629" : "Pay directly by card"}</strong>
								<span>{isArabic ? "\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u062a\u062f\u062e\u0644 \u062f\u0627\u062e\u0644 \u062d\u0642\u0648\u0644 PayPal \u0627\u0644\u0622\u0645\u0646\u0629." : "Card details stay inside PayPal secure fields."}</span>
							</div>
						</div>
						<PayPalCardFieldsErrorBoundary
							resetKey={cardFieldsResetKey}
							fallback={cardFieldsUnavailableAlert}
						>
							<PayPalCardFieldsProvider
								createOrder={createOrder}
								onApprove={onApprove}
								onError={async (error) => {
									if (isPayPalPendingReviewPayload(error?.response || error)) {
										handlePendingReview(error?.response || error);
										return;
									}
									await cancelPending();
									if (!shouldSuppressPaymentError(error)) {
										message.open({
											key: "checkout-payment-error",
											type: "error",
											content: paypalErrorMessage(error, isArabic, "card"),
											duration: 4,
										});
									}
								}}
							>
								<PayPalCardFieldsForm>
									<div className="paypal-card-field full">
										<label>{isArabic ? "\u0627\u0633\u0645 \u062d\u0627\u0645\u0644 \u0627\u0644\u0628\u0637\u0627\u0642\u0629" : "Cardholder name"}</label>
										<div className="paypal-hosted-field">
											<PayPalNameField />
										</div>
									</div>
									<div className="paypal-card-field full">
										<label>{isArabic ? "\u0631\u0642\u0645 \u0627\u0644\u0628\u0637\u0627\u0642\u0629" : "Card number"}</label>
										<div className="paypal-hosted-field">
											<PayPalNumberField />
										</div>
									</div>
									<div className="paypal-card-fields-row">
										<div className="paypal-card-field">
											<label>{isArabic ? "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621" : "Expiry date"}</label>
											<div className="paypal-hosted-field">
												<PayPalExpiryField />
											</div>
										</div>
										<div className="paypal-card-field">
											<label>{isArabic ? "\u0631\u0645\u0632 CVV" : "CVV"}</label>
											<div className="paypal-hosted-field">
												<PayPalCVVField />
											</div>
										</div>
									</div>
								</PayPalCardFieldsForm>
								<CardFieldsSubmitButton
									allowInteract={allowInteract}
									labels={{
										pay: isArabic
											? `\u0627\u062f\u0641\u0639 ${payButtonAmountLabel} \u0628\u0627\u0644\u0628\u0637\u0627\u0642\u0629`
											: `Pay ${payButtonAmountLabel} by card`,
										processing: isArabic ? "\u062c\u0627\u0631\u064a \u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u062f\u0641\u0639..." : "Processing payment...",
										incomplete: isArabic
											? "\u064a\u0631\u062c\u0649 \u0625\u0643\u0645\u0627\u0644 \u0627\u0633\u0645 \u062d\u0627\u0645\u0644 \u0627\u0644\u0628\u0637\u0627\u0642\u0629\u060c \u0631\u0642\u0645 \u0627\u0644\u0628\u0637\u0627\u0642\u0629\u060c \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621\u060c \u0648\u0631\u0645\u0632 CVV."
											: "Please complete the cardholder name, card number, expiry date, and CVV.",
										failed: paypalErrorMessage(null, isArabic, "card"),
									}}
									onBeforeSubmit={validateCardSubmitReadiness}
									shouldSuppressError={shouldSuppressPaymentError}
								/>
							</PayPalCardFieldsProvider>
						</PayPalCardFieldsErrorBoundary>
					</div>
				) : cardFieldsStatus === "checking" ? (
					<div className="paypal-card-fields-panel paypal-card-fields-loading" dir={isArabic ? "rtl" : "ltr"}>
						<div className="paypal-card-fields-head">
							<CreditCard size={18} />
							<div>
								<strong>{isArabic ? "\u0627\u062f\u0641\u0639 \u0645\u0628\u0627\u0634\u0631\u0629 \u0628\u0627\u0644\u0628\u0637\u0627\u0642\u0629" : "Pay directly by card"}</strong>
								<span>{isArabic ? "\u062c\u0627\u0631\u064a \u062a\u062c\u0647\u064a\u0632 \u062d\u0642\u0648\u0644 \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0622\u0645\u0646\u0629..." : "Preparing secure card fields..."}</span>
							</div>
						</div>
						<div className="paypal-loading compact">
							<Spin />
						</div>
					</div>
				) : cardFieldsUnavailableAlert
			) : null}
		</div>
	);
}

export default function CheckoutClient({ website = {} }) {
	const router = useRouter();
	const { message } = AntdApp.useApp();
	const {
		cart,
		language,
		t,
		totals,
		isArabic,
		hrefWithLanguage,
		updateCartItem,
		removeCartItem,
		nightsBetween,
		clearCart,
		setAuthSession,
		currency,
		formatCurrency,
	} = useJannatApp();
	const [form] = Form.useForm();
	const [guestAgreed, setGuestAgreed] = useState(false);
	const [selectedPaymentOption, setSelectedPaymentOption] = useState("");
	const [checkoutIssue, setCheckoutIssue] = useState(null);
	const [convertedAmounts, setConvertedAmounts] = useState({
		totalUSD: "0.00",
		depositUSD: "0.00",
		totalRoomsPricePerNightUSD: "0.00",
	});
	const [paymentConversionError, setPaymentConversionError] = useState(false);
	const [paypalToken, setPaypalToken] = useState(null);
	const [loadingPayPal, setLoadingPayPal] = useState(false);
	const [paypalWalletOnly, setPaypalWalletOnly] = useState(false);
	const [paypalReloadKey, setPaypalReloadKey] = useState(0);
	const [applePayCapable, setApplePayCapable] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [paypalPendingReview, setPaypalPendingReview] = useState(null);

	const totalSar = useMemo(() => cartTotal(cart), [cart]);
	const totalRooms = useMemo(() => cartRoomsCount(cart), [cart]);
	const legacyCommissionAmount = useMemo(() => legacyDepositAmount(cart), [cart]);
	const firstHotel = cart[0] || {};
	const uniqueHotelIds = useMemo(() => [...new Set(cart.map((item) => item.hotelId).filter(Boolean))], [cart]);
	const oneHotelOnly = uniqueHotelIds.length <= 1;
	const acceptance = {
		...defaultGuestPaymentAcceptance,
		...(firstHotel.guestPaymentAcceptance || {}),
	};
	const checkoutFieldClass = useCallback(
		(field, base = "") =>
			[base, checkoutIssue?.field === field ? "checkout-field-attention" : ""].filter(Boolean).join(" "),
		[checkoutIssue?.field]
	);
	const showCheckoutValidationError = useCallback(
		(field, customMessage) => {
			const content = customMessage || checkoutValidationMessage(field, isArabic);
			setCheckoutIssue({ field, content });
			message.open({
				key: CHECKOUT_VALIDATION_MESSAGE_KEY,
				type: "error",
				content,
				duration: 4,
			});
			focusCheckoutIssue(field);
		},
		[isArabic, message]
	);
	const handleCheckoutValuesChange = useCallback((_changed, allValues) => {
		setCheckoutIssue((current) => {
			if (!current || !checkoutFormIssueFields.has(current.field)) return current;
			return isCheckoutFormIssueResolved(current.field, allValues) ? null : current;
		});
	}, []);
	const handleTermsChange = useCallback((event) => {
		const checked = Boolean(event.target.checked);
		setGuestAgreed(checked);
		if (checked) {
			trackConversion(
				"termsAccepted",
				{
					content_name: "Checkout terms",
					checkout_context: "cart_checkout",
					value: totalSar || undefined,
					currency: totalSar ? "SAR" : undefined,
				},
				["Terms And Conditions Accepted"]
			);
			setCheckoutIssue((current) => (current?.field === "terms" ? null : current));
		}
	}, [totalSar]);
	const handlePaymentOptionChange = useCallback((nextPaymentOption) => {
		if (paypalPendingReview) return;
		setSelectedPaymentOption(nextPaymentOption);
		trackConversion(
			"paymentOption",
			{
				payment_type: nextPaymentOption,
				checkout_context: "cart_checkout",
				value: totalSar || undefined,
				currency: totalSar ? "SAR" : undefined,
			},
			["Selected Payment Option"]
		);
		setCheckoutIssue((current) => (current?.field === "paymentOption" ? null : current));
	}, [paypalPendingReview, totalSar]);

	const showPayPalPendingReview = useCallback((payload = {}) => {
		setPaypalPendingReview(payload || {});
		setSubmitting(false);
	}, []);

	useEffect(() => {
		if (!cart.length || !totalSar) return;
		trackConversion(
			"beginCheckout",
			{
				value: totalSar,
				currency: "SAR",
				items: cart.map((item) => ({
					item_id: item.roomId || item.id,
					item_name: item.roomName,
					item_category: item.hotelName,
					quantity: item.amount,
					price: item.price,
				})),
			},
			["Begin Checkout"]
		);
	}, [cart, totalSar]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const session = window.ApplePaySession;
		const canMakePayments =
			Boolean(session) &&
			(typeof session.canMakePayments !== "function" || session.canMakePayments());
		setApplePayCapable(canMakePayments);
	}, []);

	useEffect(() => {
		if (!selectedPaymentOption) {
			if (acceptance.acceptDeposit !== false) setSelectedPaymentOption("acceptDeposit");
			else if (acceptance.acceptPayWholeAmount !== false) setSelectedPaymentOption("acceptPayWholeAmount");
			else if (acceptance.acceptReserveNowPayInHotel) setSelectedPaymentOption("acceptReserveNowPayInHotel");
		}
	}, [acceptance.acceptDeposit, acceptance.acceptPayWholeAmount, acceptance.acceptReserveNowPayInHotel, selectedPaymentOption]);

	const syncCheckoutFieldToQuery = useCallback((field, value) => {
		const paramKey = checkoutQueryFields[field];
		if (!paramKey || typeof window === "undefined") return;

		const normalized = normalizeCheckoutQueryValue(field, value);
		const url = new URL(window.location.href);
		if (normalized) {
			url.searchParams.set(paramKey, normalized);
		} else {
			url.searchParams.delete(paramKey);
		}

		(checkoutQueryAliases[field] || [])
			.filter((alias) => alias !== paramKey)
			.forEach((alias) => url.searchParams.delete(alias));

		window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
	}, []);

	useEffect(() => {
		const queryValues = checkoutValuesFromQuery();
		if (Object.keys(queryValues).length) {
			form.setFieldsValue(queryValues);
		}
	}, [form]);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			if (!totalSar) {
				setPaymentConversionError(false);
				setConvertedAmounts({
					depositUSD: "0.00",
					totalUSD: "0.00",
					totalRoomsPricePerNightUSD: "0.00",
				});
				return;
			}
			try {
				const rows = await currencyConversion([totalSar * 0.15, totalSar, totalSar]);
				const totalUSD = Number(rows?.[1]?.amountInUSD);
				const roomsUSD = Number(rows?.[2]?.amountInUSD);
				if (!(totalUSD > 0) || !(roomsUSD > 0)) {
					throw new Error("Currency conversion did not return valid USD amounts.");
				}
				if (!cancelled) {
					setConvertedAmounts({
						depositUSD: toMoney(totalUSD * 0.15).toFixed(2),
						totalUSD: toMoney(totalUSD).toFixed(2),
						totalRoomsPricePerNightUSD: toMoney(roomsUSD).toFixed(2),
					});
					setPaymentConversionError(false);
				}
			} catch (error) {
				console.error("PayPal currency conversion failed:", error);
				if (!cancelled) {
					setConvertedAmounts({
						depositUSD: "0.00",
						totalUSD: "0.00",
						totalRoomsPricePerNightUSD: "0.00",
					});
					setPaymentConversionError(true);
				}
			}
		};
		load();
		return () => {
			cancelled = true;
		};
	}, [totalSar]);

	useEffect(() => {
		let cancelled = false;
		const loadToken = async () => {
			if (!cart.length) return;
			setLoadingPayPal(true);
			try {
				const token = await getPayPalClientToken();
				if (!cancelled) {
					setPaypalToken(token);
					setPaypalWalletOnly(false);
				}
			} catch (error) {
				console.error("PayPal token failed:", error);
				if (!cancelled) setPaypalToken(null);
			} finally {
				if (!cancelled) setLoadingPayPal(false);
			}
		};
		loadToken();
		return () => {
			cancelled = true;
		};
	}, [cart.length]);

	const getCustomerDetails = useCallback(() => {
		const values = form.getFieldsValue();
		const phone = normalizePhoneInput(values.phone);
		const password = passwordFromPhone(phone);
		return {
			name: String(values.fullName || "").trim(),
			phone,
			email: String(values.email || "").trim().toLowerCase(),
			passport: String(values.passport || "Not Provided").trim(),
			passportExpiry: String(values.passportExpiry || "2029-12-20").trim(),
			nationality: String(values.nationality || "").trim(),
			postalCode: "",
			state: "",
			reservedBy: "Jannat Booking Website",
			password,
			confirmPassword: password,
			notes: String(values.notes || "").trim(),
		};
	}, [form]);

	const validateCheckoutDetails = useCallback(
		({ requirePaymentOption = false } = {}) => {
			if (!cart.length) {
				showCheckoutValidationError("cart");
				return null;
			}
			const packageIssue = cartPackageIssue(cart);
			if (packageIssue?.code === "invalid-package") {
				showCheckoutValidationError("package");
				return null;
			}
			if (packageIssue?.code === "mixed-package-cart") {
				showCheckoutValidationError("mixedPackageCart");
				return null;
			}
			if (packageIssue?.code === "mixed-package-dates") {
				showCheckoutValidationError("mixedPackageDates");
				return null;
			}
			if (!oneHotelOnly) {
				showCheckoutValidationError("hotel");
				return null;
			}
			if (requirePaymentOption && !selectedPaymentOption) {
				showCheckoutValidationError("paymentOption");
				return null;
			}
			if (!guestAgreed) {
				showCheckoutValidationError("terms");
				return null;
			}
			const details = getCustomerDetails();
			if (!details.name || details.name.split(/\s+/).length < 2) {
				showCheckoutValidationError("fullName");
				return null;
			}
			if (!/^\+?[0-9\s-]{5,}$/.test(details.phone)) {
				showCheckoutValidationError("phone");
				return null;
			}
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
				showCheckoutValidationError("email");
				return null;
			}
			if (!details.nationality) {
				showCheckoutValidationError("nationality");
				return null;
			}
			return details;
		},
		[cart, getCustomerDetails, guestAgreed, oneHotelOnly, selectedPaymentOption, showCheckoutValidationError]
	);

	const buildReservationPayload = useCallback(
		({ payInHotel = false, payment = "pending_payment", paidAmount = 0, commissionPaid = false } = {}) => {
			const customerDetails = validateCheckoutDetails({ requirePaymentOption: true });
			if (!customerDetails) return null;
			const totalAmount = payInHotel ? totalSar * 1.1 : totalSar;
			const pickedRoomsType = transformCartToPickedRoomsType(cart, { payInHotel });
			return {
				sentFrom: "client",
				userId: null,
				hotelId: firstHotel.hotelId,
				hotelName: firstHotel.hotelName || "",
				belongsTo: firstHotel.belongsTo || "",
				customerDetails,
				total_rooms: totalRooms,
				total_guests: safeNumber(firstHotel.adults, 1) + safeNumber(firstHotel.children, 0),
				adults: safeNumber(firstHotel.adults, 1),
				children: safeNumber(firstHotel.children, 0),
				total_amount: toMoney(totalAmount),
				payment,
				paymentClicked: "Clicked",
				payment_method: payment === "Not Paid" ? "Unpaid" : "PayPal",
				paid_amount: toMoney(paidAmount),
				commission: payment === "Deposit Paid" ? toMoney(totalSar * 0.15) : toMoney(legacyCommissionAmount),
				commissionPaid,
				checkin_date: firstHotel.checkIn || "",
				checkout_date: firstHotel.checkOut || "",
				days_of_residence: nightsBetween(firstHotel.checkIn, firstHotel.checkOut),
				booking_source: "Online Jannat Booking",
				sourceWebsite: "jannatbooking_ssr",
				supportOrigin: "jannatbooking",
				pickedRoomsType,
				convertedAmounts,
				guestAgreedOnTermsAndConditions: guestAgreed,
				usePassword: customerDetails.password || "",
			};
		},
		[cart, convertedAmounts, firstHotel, guestAgreed, legacyCommissionAmount, nightsBetween, totalRooms, totalSar, validateCheckoutDetails]
	);

	const createUncompletedDocument = useCallback(
		async (rootCause) => {
			const values = form.getFieldsValue();
			if (!(values.phone || values.email) || !cart.length || cartPackageIssue(cart)) return;
			try {
				const payment =
					selectedPaymentOption === "acceptDeposit"
						? "Deposit Paid"
						: selectedPaymentOption === "acceptPayWholeAmount"
							? "Paid Online"
							: "Not Paid";
				const phone = normalizePhoneInput(values.phone);
				const customerDetails = {
					name: String(values.fullName || "").trim() || "Guest",
					phone,
					email: String(values.email || "").trim().toLowerCase(),
					passport: String(values.passport || "Not Provided").trim(),
					passportExpiry: String(values.passportExpiry || "2029-12-20").trim(),
					nationality: String(values.nationality || "").trim(),
					reservedBy: "Jannat Booking Website",
					password: passwordFromPhone(phone),
				};
				const payInHotel = selectedPaymentOption === "acceptReserveNowPayInHotel";
				const payload = {
					guestAgreedOnTermsAndConditions: guestAgreed,
					userId: null,
					hotelId: firstHotel.hotelId,
					hotelName: firstHotel.hotelName || "",
					belongsTo: firstHotel.belongsTo || "",
					customerDetails,
					total_rooms: totalRooms,
					total_guests: safeNumber(firstHotel.adults, 1) + safeNumber(firstHotel.children, 0),
					adults: safeNumber(firstHotel.adults, 1),
					children: safeNumber(firstHotel.children, 0),
					total_amount: toMoney(payInHotel ? totalSar * 1.1 : totalSar),
					payment,
					paid_amount:
						selectedPaymentOption === "acceptDeposit"
							? toMoney(totalSar * 0.15)
							: selectedPaymentOption === "acceptPayWholeAmount"
								? toMoney(totalSar)
								: 0,
					commission: payment === "Deposit Paid" ? toMoney(totalSar * 0.15) : toMoney(legacyCommissionAmount),
					commissionPaid: selectedPaymentOption !== "acceptReserveNowPayInHotel",
					checkin_date: firstHotel.checkIn || "",
					checkout_date: firstHotel.checkOut || "",
					days_of_residence: nightsBetween(firstHotel.checkIn, firstHotel.checkOut),
					booking_source: "Online Jannat Booking",
					sourceWebsite: "jannatbooking_ssr",
					pickedRoomsType: transformCartToPickedRoomsType(cart, { payInHotel }),
					convertedAmounts,
					rootCause,
				};
				await createUncompleteReservationDocument({ ...payload, rootCause });
			} catch (error) {
				console.warn("Uncompleted reservation tracking failed:", error?.message || error);
			}
		},
		[cart, convertedAmounts, firstHotel, form, guestAgreed, legacyCommissionAmount, nightsBetween, selectedPaymentOption, totalRooms, totalSar]
	);

	const getPendingReservationPayload = useCallback(() => {
		const payment = selectedPaymentOption === "acceptDeposit" ? "pending_payment" : "pending_payment";
		return buildReservationPayload({
			payInHotel: false,
			payment,
			paidAmount: 0,
			commissionPaid: false,
		});
	}, [buildReservationPayload, selectedPaymentOption]);

	const reservePayInHotel = async () => {
		const payload = buildReservationPayload({
			payInHotel: true,
			payment: "Not Paid",
			paidAmount: 0,
			commissionPaid: false,
		});
		if (!payload) return;
		setSubmitting(true);
		try {
			await createUncompletedDocument("Reserve now, pay in hotel");
			const response = await createReservationViaPayPal(payload);
			message.success(response?.message || (isArabic ? "تم إرسال طلب الحجز." : "Reservation request submitted."));
			trackConversion(
				"reservationRequest",
				{
					value: payload.total_amount,
					currency: "SAR",
				transaction_id: response?.data?._id || response?.reservation?._id || undefined,
				payment_type: "pay_in_hotel",
				checkout_context: "cart_checkout",
				items: cart.map((item) => ({
					item_id: item.roomId || item.id,
					item_name: item.roomName,
					item_category: item.hotelName,
					quantity: item.amount,
					price: item.price,
				})),
			},
			["Reservation Request Submitted"]
		);
			clearCart();
			const params = new URLSearchParams({
				name: payload.customerDetails.name,
				total_price: String(payload.total_amount),
				total_rooms: String(payload.total_rooms),
				lang: language,
			});
			router.push(`/reservation-confirmed?${params.toString()}`);
		} catch (error) {
			message.error(error?.response?.message || error?.message || (isArabic ? "تعذر إرسال الحجز." : "We could not create the reservation."));
		} finally {
			setSubmitting(false);
		}
	};

	const handlePayPalApproved = async (paypalPayload) => {
		const option = paypalPayload?.option;
		const payment = optionLabel(option);
		const payload = buildReservationPayload({
			payInHotel: false,
			payment,
			paidAmount: safeNumber(paypalPayload?.sarAmount, 0),
			commissionPaid: true,
		});
		if (!payload) return;
		const response = await createReservationViaPayPal({
			...payload,
			option,
			convertedAmounts: paypalPayload.convertedAmounts || convertedAmounts,
			pendingReservationId: paypalPayload.pendingReservationId,
			confirmation_number: paypalPayload.confirmation_number,
			paypal: paypalPayload.paypal,
		});
		if (isPayPalPendingReviewPayload(response)) {
			showPayPalPendingReview(response);
			message.open({
				key: "checkout-payment-review",
				type: "warning",
				content: pendingReviewCopy(isArabic).description,
				duration: 8,
			});
			return;
		}
		message.success(response?.message || (isArabic ? "تم إنشاء الحجز بنجاح." : "Reservation created successfully."));
		const reservation = response?.data || response?.reservation || {};
		const accountSession = response?.accountSession;
		trackConversion(
			"reservationPayment",
			{
				value: payload.total_amount,
				currency: "SAR",
				transaction_id:
					reservation.confirmation_number ||
					paypalPayload.confirmation_number ||
					reservation._id ||
					undefined,
				payment_type: option,
				checkout_context: "cart_checkout",
				paypal_currency: "USD",
				paypal_value:
					option === "acceptDeposit"
						? paypalPayload?.convertedAmounts?.depositUSD
						: paypalPayload?.convertedAmounts?.totalUSD,
				items: cart.map((item) => ({
					item_id: item.roomId || item.id,
					item_name: item.roomName,
					item_category: item.hotelName,
					quantity: item.amount,
					price: item.price,
				})),
			},
			["Reservation Paid"]
		);
		const params = new URLSearchParams({
			name: payload.customerDetails.name,
			total_price: String(payload.total_amount),
			total_rooms: String(payload.total_rooms),
			lang: language,
		});
		if (reservation.confirmation_number || paypalPayload.confirmation_number) {
			params.set("confirmation_number", reservation.confirmation_number || paypalPayload.confirmation_number);
		}
		if (reservation?._id) params.set("reservationId", reservation._id);
		clearCart();
		if (accountSession?.token && accountSession?.user?._id) {
			setAuthSession(accountSession);
			const dashboardParams = new URLSearchParams({
				reservation: reservation.confirmation_number || paypalPayload.confirmation_number || "",
				paid: "1",
			});
			router.push(hrefWithLanguage(`/dashboard?${dashboardParams.toString()}`));
			return;
		}
		router.push(`/reservation-confirmed?${params.toString()}`);
	};

	const paypalClientId =
		paypalToken?.clientId ||
		paypalToken?.client_id ||
		(paypalToken?.env === "live"
			? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE
			: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_SANDBOX);
	const paypalScriptKey = `${paypalClientId || "paypal"}-${shortSig(paypalToken?.clientToken || "")}-${paypalToken?.env || "env"}-${paypalWalletOnly ? "buttons" : "cardfields"}-${applePayCapable ? "applepay" : "noapple"}-${paypalReloadKey}-${isArabic ? "ar" : "en"}`;
	const paypalScriptOptions = useMemo(() => {
		if (!paypalClientId) return null;
		return {
			"client-id": paypalClientId,
			...(paypalToken?.clientToken && !paypalWalletOnly
				? { "data-client-token": paypalToken.clientToken }
				: {}),
			components: `${paypalToken?.clientToken && !paypalWalletOnly ? "buttons,card-fields" : "buttons"}${applePayCapable ? ",applepay" : ""}`,
			currency: "USD",
			intent: "capture",
			commit: true,
			"enable-funding": "paypal,card",
			"disable-funding": "credit,venmo,paylater",
			locale: isArabic ? "ar_EG" : "en_US",
		};
	}, [
		applePayCapable,
		isArabic,
		paypalClientId,
		paypalToken?.clientToken,
		paypalWalletOnly,
	]);

	if (!cart.length) {
		return (
			<section className="section checkout-shell compact-checkout" dir={isArabic ? "rtl" : "ltr"}>
				<div className="container checkout-empty premium-card">
					<ShoppingCart size={36} />
					<h1>{t("cartEmpty")}</h1>
					<Link className="btn btn-primary" href={hrefWithLanguage("/our-hotels")}>
						{t("browseHotels")}
					</Link>
				</div>
			</section>
		);
	}

	return (
		<section className="section checkout-shell compact-checkout" dir={isArabic ? "rtl" : "ltr"}>
			<div className="container checkout-layout">
				<div className="checkout-form premium-card">
					<p className="eyebrow">{t("guestDetails")}</p>
					<h1>{t("checkoutTitle")}</h1>
					<p>{t("checkoutCopy")}</p>
					{!oneHotelOnly ? (
						<Alert
							type="warning"
							showIcon
							title={isArabic ? "يرجى اختيار غرف من فندق واحد فقط لكل حجز." : "Please keep one hotel per reservation."}
						/>
					) : null}
					<Form
						form={form}
						layout="vertical"
						requiredMark={false}
						className="checkout-fields-grid"
						onValuesChange={handleCheckoutValuesChange}
					>
						<Form.Item
							name="fullName"
							label={t("fullName")}
							rules={[{ required: true, message: t("fullName") }]}
							className={checkoutFieldClass("fullName")}
							data-checkout-field="fullName"
						>
							<Input
								id="checkout-full-name"
								size="large"
								status={checkoutIssue?.field === "fullName" ? "error" : undefined}
								aria-invalid={checkoutIssue?.field === "fullName"}
								onBlur={(event) => syncCheckoutFieldToQuery("fullName", event.target.value)}
							/>
						</Form.Item>
						<Form.Item
							name="phone"
							label={t("phone")}
							rules={[{ required: true, message: t("phone") }]}
							className={checkoutFieldClass("phone")}
							data-checkout-field="phone"
						>
							<Input
								id="checkout-phone"
								size="large"
								dir="ltr"
								inputMode="tel"
								status={checkoutIssue?.field === "phone" ? "error" : undefined}
								aria-invalid={checkoutIssue?.field === "phone"}
								onBlur={(event) => syncCheckoutFieldToQuery("phone", event.target.value)}
								onChange={(event) => form.setFieldValue("phone", normalizePhoneInput(event.target.value))}
							/>
						</Form.Item>
						<Form.Item
							name="email"
							label={t("emailAddress")}
							rules={[{ required: true, type: "email", message: t("emailAddress") }]}
							className={checkoutFieldClass("email")}
							data-checkout-field="email"
						>
							<Input
								id="checkout-email"
								size="large"
								dir="ltr"
								type="email"
								status={checkoutIssue?.field === "email" ? "error" : undefined}
								aria-invalid={checkoutIssue?.field === "email"}
								onBlur={(event) => syncCheckoutFieldToQuery("email", event.target.value)}
							/>
						</Form.Item>
						<Form.Item name="nationality" label={isArabic ? "الجنسية" : "Nationality"} rules={[{ required: true, message: isArabic ? "يرجى اختيار الجنسية." : "Please select your nationality." }]}>
							<Select
								id="checkout-nationality"
								allowClear
								showSearch
								size="large"
								className={`checkout-nationality-select${checkoutIssue?.field === "nationality" ? " checkout-field-attention" : ""}`}
								classNames={{ popup: { root: "checkout-nationality-dropdown" } }}
								optionFilterProp="label"
								filterOption={filterCountryOption}
								status={checkoutIssue?.field === "nationality" ? "error" : undefined}
								onChange={(value) => syncCheckoutFieldToQuery("nationality", value || "")}
								options={COUNTRY_SELECT_OPTIONS}
								placeholder={isArabic ? "اختر الجنسية" : "Select nationality"}
							/>
						</Form.Item>
						<Form.Item name="notes" label={t("notes")} className="checkout-notes-field">
							<Input.TextArea rows={3} placeholder={t("notesPlaceholder")} />
						</Form.Item>
					</Form>

					<PaymentOptions
						acceptance={acceptance}
						selected={selectedPaymentOption}
						setSelected={handlePaymentOptionChange}
						totalSar={totalSar}
						totalUsd={safeNumber(convertedAmounts.totalUSD, 0)}
						isArabic={isArabic}
						onTouched={createUncompletedDocument}
						hasError={checkoutIssue?.field === "paymentOption"}
						selectedCurrency={currency}
						formatCurrency={formatCurrency}
					/>
					<div
						className={`terms-row${checkoutIssue?.field === "terms" ? " checkout-field-attention" : ""}`}
						data-checkout-field="terms"
					>
						<Checkbox checked={guestAgreed} onChange={handleTermsChange} aria-invalid={checkoutIssue?.field === "terms"}>
							{isArabic ? "أوافق على الشروط والأحكام" : "I accept the Terms & Conditions"}
						</Checkbox>
					</div>
					{paypalPendingReview ? (
						<Alert
							type="warning"
							showIcon
							className="checkout-payment-review-alert"
							message={pendingReviewCopy(isArabic).title}
							description={
								<span>
									{pendingReviewCopy(isArabic).description}
									{paypalPendingReview.confirmation_number ? (
										<>
											{" "}
											<b dir="ltr" className="ltr-value">
												{paypalPendingReview.confirmation_number}
											</b>
										</>
									) : null}
								</span>
							}
						/>
					) : selectedPaymentOption === "acceptReserveNowPayInHotel" ? (
						<Button
							type="primary"
							size="large"
							block
							loading={submitting}
							disabled={!oneHotelOnly}
							onClick={reservePayInHotel}
							icon={<ShieldCheck size={18} />}
						>
							{isArabic ? "احجز الآن" : "Reserve Now"}
						</Button>
					) : loadingPayPal ? (
						<div className="paypal-loading">
							<Spin />
						</div>
					) : paymentConversionError ? (
						<Alert
							type="error"
							showIcon
							title={isArabic ? "تعذر تحديث سعر الصرف للدفع." : "Payment exchange rate is unavailable."}
							description={
								isArabic
									? "يرجى المحاولة مرة أخرى بعد قليل. لن يتم إنشاء أي دفعة عبر PayPal بدون سعر صرف مباشر من الريال السعودي إلى الدولار الأمريكي."
									: "Please try again in a moment. PayPal payment will not start without a live SAR to USD exchange rate."
							}
						/>
					) : paypalClientId ? (
						<PayPalScriptProvider
							key={paypalScriptKey}
							options={paypalScriptOptions}
						>
							<JannatPayPalButtons
								canPay={oneHotelOnly}
								isArabic={isArabic}
								selectedPaymentOption={selectedPaymentOption}
								convertedAmounts={convertedAmounts}
								totalSar={totalSar}
								guestAgreed={guestAgreed}
								getPendingReservationPayload={getPendingReservationPayload}
								onPayApproved={handlePayPalApproved}
								onTouched={createUncompletedDocument}
								onValidationError={showCheckoutValidationError}
								onPaymentPendingReview={showPayPalPendingReview}
								selectedCurrency={currency}
								formatCurrency={formatCurrency}
								walletOnly={paypalWalletOnly || !paypalToken?.clientToken}
								onUseWalletOnly={() => setPaypalWalletOnly(true)}
								onReloadPayment={() => {
									setPaypalWalletOnly(false);
									setPaypalReloadKey((current) => current + 1);
								}}
							/>
						</PayPalScriptProvider>
					) : (
						<Alert
							type="error"
							showIcon
							title={isArabic ? "تعذر تحميل PayPal حاليا." : "PayPal is not available right now."}
						/>
					)}
				</div>

				<div className="checkout-summary premium-card">
					<div className="checkout-summary-head">
						<span className="summary-icon">
							<ShoppingCart size={20} />
						</span>
						<div>
							<p className="eyebrow">{t("cart")}</p>
							<h2>{t("yourCart")}</h2>
						</div>
						<strong dir="ltr" className="summary-count ltr-value">
							{totalRooms} {isArabic ? "غرف" : totalRooms === 1 ? "room" : "rooms"}
						</strong>
					</div>
					<div className="checkout-items">
						{cart.map((item) => {
							const nights = nightsBetween(item.checkIn, item.checkOut);
							const packageHijriLabel = isArabic
								? item.packageMeta?.hijriLabelAr
								: item.packageMeta?.hijriLabelEn || item.packageMeta?.hijriLabelAr;
							return (
								<article key={`${item.id}-${item.checkIn}-${item.checkOut}`}>
									<div className="checkout-item-image">
										{item.image ? (
											<OptimizedImage
												src={item.image}
												alt={item.roomName}
												fill
												sizes="82px"
												quality={68}
											/>
										) : (
											<BedDouble size={26} />
										)}
									</div>
									<div className="checkout-item-main">
										<strong>{item.roomName}</strong>
										<span className="checkout-hotel-name">
											<Hotel size={15} />
											{item.hotelName}
										</span>
										{packageHijriLabel ? (
											<span className="checkout-package-hijri">
												<CalendarDays size={14} />
												{packageHijriLabel}
											</span>
										) : null}
										<small>
											<CalendarDays size={14} />
											<bdi dir="ltr" className="ltr-value">
												{item.checkIn} - {item.checkOut}
											</bdi>
											<span className="checkout-dot" aria-hidden="true" />
											<span className="checkout-nights-value">
												<bdi dir="ltr" className="ltr-value">
													{nights}
												</bdi>
												{" "}
												<span>{nights > 1 ? t("nights") : t("night")}</span>
											</span>
										</small>
										<div className="checkout-item-actions">
											<InputNumber
												min={1}
												max={20}
												value={item.amount}
												onChange={(value) => updateCartItem(item.id, { amount: Number(value || 1) })}
											/>
											<button type="button" onClick={() => removeCartItem(item.id)}>
												<Trash2 size={15} />
												{t("remove")}
											</button>
										</div>
									</div>
									<b dir="ltr" className="checkout-line-price ltr-value">{formatCurrency(itemTotal(item))}</b>
								</article>
							);
						})}
					</div>
					<div className="checkout-total">
						<span>{t("total")}</span>
						<strong dir="ltr" className="ltr-value">{formatCurrency(totals.amount)}</strong>
					</div>
					<div className="checkout-payment-note">
						<span className="summary-icon small">
							<CreditCard size={16} />
						</span>
						<span>{isArabic ? "الدفع الآمن عبر PayPal أو البطاقة." : "Secure payment by PayPal or card."}</span>
					</div>
				</div>
			</div>
		</section>
	);
}
