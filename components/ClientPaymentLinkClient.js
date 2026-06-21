"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App as AntdApp, Button, Spin } from "antd";
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
import {
	BedDouble,
	CalendarDays,
	CheckCircle2,
	CreditCard,
	FileText,
	Hotel,
	LockKeyhole,
	ReceiptText,
	ShieldCheck,
	UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	createPayPalOrder,
	currencyConversion,
	getPayPalClientToken,
	payReservationViaPayPalLink,
	recoverReservationPaymentAccountSession,
} from "../lib/api";
import { trackConversion } from "../lib/analyticsEvents";
import { safeNumber } from "../lib/booking";
import { useJannatApp } from "./JannatAppProvider";

const APPLE_PAY_SDK_SRC = "https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js";
const VALIDATION_KEY = "client-payment-validation";

const text = {
	en: {
		eyebrow: "Secure payment",
		title: "Complete your reservation payment",
		copy: "Review the reservation, choose the amount to pay, and complete payment securely. PayPal is charged in USD while the reservation remains recorded in SAR.",
		notFoundTitle: "Payment link unavailable",
		notFoundCopy: "We could not load this reservation. Please contact Jannat Booking support with the link you received.",
		mismatchTitle: "This payment link does not match the reservation",
		mismatchCopy: "The confirmation reference in the URL does not match the reservation details.",
		reservation: "Reservation",
		guest: "Guest",
		hotel: "Hotel",
		confirmation: "Confirmation",
		dates: "Dates",
		total: "Total",
		paid: "Paid",
		remaining: "Remaining",
		alreadyPaidTitle: "This reservation is fully paid",
		alreadyPaidCopy: "The guest account and invoice are available from the links below.",
		chooseAmount: "Payment amount",
		requestedAmount: "Requested payment",
		deposit: "Deposit",
		fullAmount: "Full amount",
		remainingAmount: "Remaining amount",
		terms: "I accept the Terms & Conditions",
		payNow: "You will pay now",
		paypalUnavailable: "PayPal is not available right now.",
		conversionUnavailable: "Live SAR to USD exchange rate is unavailable. Please try again in a moment.",
		selectAmount: "Please choose a payment amount.",
		acceptTerms: "Please accept the Terms & Conditions.",
		amountInvalid: "The payment amount is not ready yet.",
		paymentSuccess: "Payment received. Your account and invoice are being prepared.",
		paymentFailed: "Payment could not be completed. Please try again or contact support.",
		payByCard: "Pay by card",
		processing: "Processing payment...",
		cardIncomplete: "Please complete the cardholder name, card number, expiry date, and CVV.",
		cardTitle: "Pay directly by card",
		cardCopy: "Card details stay inside PayPal secure fields.",
		cardUnavailable: "Inline card fields are not available for this attempt.",
		cardUnavailableCopy: "Please use the PayPal or card payment button above.",
		poweredBy: "Powered by",
		viewInvoice: "View invoice",
		openDashboard: "Open dashboard",
		contactSupport: "Contact support",
		reloadPayment: "Reload payment",
		walletOnly: "Continue with PayPal buttons only",
		moduleFailed: "Payment module could not load",
		moduleFailedCopy: "Please try again. If this continues, disable ad blockers or try a different network.",
		appleUnavailable: "Apple Pay is not available on this device or browser.",
		accountNote: "After payment, an account is created or linked using the reservation email so the guest can access the dashboard.",
		receiptNote: "The invoice receipt is emailed after a successful capture.",
	},
	ar: {
		eyebrow: "دفع آمن",
		title: "إتمام دفع الحجز",
		copy: "راجع تفاصيل الحجز واختر المبلغ ثم أكمل الدفع بأمان. يتم خصم PayPal بالدولار الأمريكي مع حفظ الحجز للفندق بالريال السعودي.",
		notFoundTitle: "رابط الدفع غير متاح",
		notFoundCopy: "تعذر تحميل هذا الحجز. يرجى التواصل مع دعم جنات بوكينج وإرسال الرابط المستلم.",
		mismatchTitle: "رابط الدفع لا يطابق الحجز",
		mismatchCopy: "رقم التأكيد الموجود في الرابط لا يطابق بيانات الحجز.",
		reservation: "الحجز",
		guest: "الضيف",
		hotel: "الفندق",
		confirmation: "رقم التأكيد",
		dates: "التواريخ",
		total: "الإجمالي",
		paid: "المدفوع",
		remaining: "المتبقي",
		alreadyPaidTitle: "تم دفع هذا الحجز بالكامل",
		alreadyPaidCopy: "يمكن للضيف الدخول للحساب ومراجعة الفاتورة من الروابط بالأسفل.",
		chooseAmount: "مبلغ الدفع",
		requestedAmount: "المبلغ المطلوب",
		deposit: "دفعة مقدمة",
		fullAmount: "المبلغ الكامل",
		remainingAmount: "المبلغ المتبقي",
		terms: "أوافق على الشروط والأحكام",
		payNow: "ستدفع الآن",
		paypalUnavailable: "PayPal غير متاح حالياً.",
		conversionUnavailable: "تعذر تحديث سعر الصرف المباشر من الريال إلى الدولار. يرجى المحاولة بعد قليل.",
		selectAmount: "يرجى اختيار مبلغ الدفع.",
		acceptTerms: "يرجى الموافقة على الشروط والأحكام.",
		amountInvalid: "مبلغ الدفع غير جاهز بعد.",
		paymentSuccess: "تم استلام الدفع. يتم تجهيز الحساب والفاتورة.",
		paymentFailed: "تعذر إتمام الدفع. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.",
		payByCard: "ادفع بالبطاقة",
		processing: "جاري معالجة الدفع...",
		cardIncomplete: "يرجى إكمال اسم حامل البطاقة ورقم البطاقة وتاريخ الانتهاء ورمز CVV.",
		cardTitle: "ادفع مباشرة بالبطاقة",
		cardCopy: "بيانات البطاقة تبقى داخل حقول PayPal الآمنة.",
		cardUnavailable: "حقول البطاقة داخل الصفحة غير متاحة لهذه المحاولة.",
		cardUnavailableCopy: "يرجى استخدام زر PayPal أو زر البطاقة بالأعلى.",
		poweredBy: "مدعوم من",
		viewInvoice: "عرض الفاتورة",
		openDashboard: "فتح لوحة التحكم",
		contactSupport: "تواصل مع الدعم",
		reloadPayment: "إعادة تحميل الدفع",
		walletOnly: "المتابعة بأزرار PayPal فقط",
		moduleFailed: "تعذر تحميل بوابة الدفع",
		moduleFailedCopy: "يرجى المحاولة مرة أخرى. إذا استمرت المشكلة، عطّل مانع الإعلانات أو جرّب شبكة مختلفة.",
		appleUnavailable: "Apple Pay غير متاح على هذا الجهاز أو المتصفح.",
		accountNote: "بعد الدفع، يتم إنشاء أو ربط حساب باستخدام بريد الحجز ليتمكن الضيف من دخول لوحة التحكم.",
		receiptNote: "يتم إرسال الفاتورة إلى بريد الضيف بعد نجاح الدفع.",
	},
};

const toMoney = (value) => Number(safeNumber(value, 0).toFixed(2));

const isPositive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const CARD_FIELDS_READY_ATTEMPTS = 60;
const CARD_FIELDS_READY_INTERVAL_MS = 200;

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

const truncatePayPalText = (value, max = 127) => {
	const textValue = String(value || "");
	if (textValue.length <= max) return textValue;
	return `${textValue.slice(0, Math.max(0, max - 3))}...`;
};

const paypalMetaId = () => {
	try {
		return window?.paypal?.getClientMetadataID?.() || null;
	} catch (_error) {
		return null;
	}
};

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

const formatIsoDate = (value, language = "en") => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return new Intl.DateTimeFormat(language === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
};

const formatHijriDate = (value, language = "en") => {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	try {
		return new Intl.DateTimeFormat(
			language === "ar" ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-US-u-ca-islamic-umalqura",
			{
				year: "numeric",
				month: "long",
				day: "numeric",
			}
		).format(date);
	} catch (_error) {
		return "-";
	}
};

const utcDayNumber = (value) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const computeReservationNights = (reservation = {}) => {
	const startDay = utcDayNumber(reservation?.checkin_date);
	const endDay = utcDayNumber(reservation?.checkout_date);
	if (startDay !== null && endDay !== null) {
		const dateNights = Math.round((endDay - startDay) / 86400000);
		if (dateNights > 0) return dateNights;
	}
	return Math.max(0, Math.round(safeNumber(reservation?.days_of_residence, 0)));
};

const cleanRoomText = (value = "") =>
	String(value || "")
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();

const summarizeReservedRooms = (reservation = {}) => {
	const sourceRooms = Array.isArray(reservation?.pickedRoomsType)
		? reservation.pickedRoomsType
		: Array.isArray(reservation?.pickedRoomsPricing)
			? reservation.pickedRoomsPricing
			: [];
	const rooms = new Map();
	sourceRooms.forEach((room = {}) => {
		const name = cleanRoomText(
			room.displayName ||
				room.display_name ||
				room.roomDisplayName ||
				room.roomName ||
				room.room_type ||
				room.roomType
		);
		if (!name) return;
		const key = name.toLowerCase();
		const count = Math.max(1, Math.round(safeNumber(room.count || room.quantity || 1, 1)));
		const existing = rooms.get(key);
		if (existing) {
			existing.count += count;
			return;
		}
		rooms.set(key, { name, count });
	});
	return Array.from(rooms.values());
};

const computeDepositSar = (reservation = {}) => {
	const rooms = Array.isArray(reservation?.pickedRoomsType) ? reservation.pickedRoomsType : [];
	let defaultDeposit = 0;
	rooms.forEach((room) => {
		const count = toMoney(room?.count || 1) || 1;
		if (Array.isArray(room?.pricingByDay) && room.pricingByDay.length) {
			const commission = room.pricingByDay.reduce(
				(total, day) => total + (safeNumber(day?.price, 0) - safeNumber(day?.rootPrice, 0)),
				0
			);
			const firstRoot = safeNumber(room.pricingByDay[0]?.rootPrice, 0);
			defaultDeposit += (commission + firstRoot) * count;
			return;
		}
		defaultDeposit += safeNumber(room?.chosenPrice, 0) * count;
	});

	const total = safeNumber(reservation?.total_amount, 0);
	const advance = reservation?.advancePayment || {};
	const percent = safeNumber(advance?.paymentPercentage, 0);
	const fixedAdvance = safeNumber(advance?.finalAdvancePayment, 0);
	if (percent > 0 && total > 0) return toMoney(total * (percent / 100));
	if (fixedAdvance > 0) return toMoney(fixedAdvance);
	if (defaultDeposit > 0) return toMoney(defaultDeposit);
	return toMoney(total * 0.15);
};

function PaymentAmount({ sarAmount, usdAmount, formatCurrency, selectedCurrency }) {
	const showSelected = selectedCurrency && selectedCurrency !== "sar";
	return (
		<span className="client-payment-amounts" dir="ltr">
			{showSelected ? (
				<span className="client-payment-selected-currency">
					<strong>{formatCurrency(sarAmount)}</strong>
					<em>Selected currency</em>
				</span>
			) : null}
			<span>
				<strong>SAR {toMoney(sarAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
				<em>Reservation ledger</em>
			</span>
			<span className="client-payment-usd">
				<strong>USD {Number(usdAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
				<em>PayPal charge</em>
			</span>
		</span>
	);
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
			if (onBeforeSubmit && !onBeforeSubmit()) return;
			if (cardFieldsForm?.getState) {
				const state = await cardFieldsForm.getState();
				if (state && !state.isFormValid) {
					message.open({ key: "client-payment-card", type: "error", content: labels.incomplete, duration: 4 });
					return;
				}
			}
			await submitFn();
		} catch (error) {
			if (error?.silent || shouldSuppressError?.(error)) return;
			message.open({ key: "client-payment-card", type: "error", content: labels.failed, duration: 4 });
		} finally {
			setBusy(false);
		}
	};

	const disabled = !allowInteract || !ready || busy;
	return (
		<button type="button" className="paypal-card-submit" onClick={submit} disabled={disabled}>
			{busy ? labels.processing : labels.pay}
		</button>
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

function ApplePayClientPaymentButton({
	allowInteract,
	labels,
	isArabic,
	selectedUsdAmount,
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
			if (window.location?.protocol !== "https:") {
				if (!cancelled) setApplepayConfig(null);
				return;
			}
			await ensureApplePaySdk();
			if (
				!window.ApplePaySession ||
				(typeof window.ApplePaySession.canMakePayments === "function" &&
					!window.ApplePaySession.canMakePayments()) ||
				!window.paypal?.Applepay
			) {
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
		if (!allowInteract) return;
		if (!window.ApplePaySession || !window.paypal?.Applepay || !applepayConfig?.isEligible) {
			message.error(labels.appleUnavailable);
			return;
		}
		const amountUsd = Number(selectedUsdAmount || 0).toFixed(2);
		if (!(Number(amountUsd) > 0)) {
			message.error(labels.amountInvalid);
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
				message.error(error?.message || labels.paymentFailed);
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
				message.error(error?.message || labels.paymentFailed);
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
				aria-label={isArabic ? "الدفع بواسطة Apple Pay" : "Pay with Apple Pay"}
			>
				<apple-pay-button buttonstyle="black" type="buy" locale="en" />
			</button>
			<span>
				{labels.poweredBy} <b>PayPal</b>
				<span className="ltr-value" dir="ltr"> {chargeLabel}</span>
			</span>
		</div>
	);
}

function ClientPaymentButtons({
	canPay,
	labels,
	isArabic,
	reservation,
	selectedOption,
	selectedUsdAmount,
	totalUsdAmount,
	onPayApproved,
	onValidationError,
	walletOnly,
	onUseWalletOnly,
	onReloadPayment,
	formatCurrency,
	selectedCurrency,
}) {
	const { message } = AntdApp.useApp();
	const [{ isResolved, isRejected }] = usePayPalScriptReducer();
	const suppressPaymentErrorUntilRef = useRef(0);
	const allowInteract =
		canPay &&
		selectedOption &&
		isPositive(selectedOption.sarAmount) &&
		isPositive(selectedUsdAmount);
	const cardFieldsStatus = usePayPalCardFieldsStatus(
		isResolved,
		walletOnly,
		`${selectedOption?.id || selectedOption?.paypalOption || "option"}-${selectedUsdAmount}`
	);

	const suppressNextPaymentError = () => {
		suppressPaymentErrorUntilRef.current = Date.now() + 4000;
	};
	const shouldSuppressPaymentError = (error) =>
		Boolean(error?.silent || Date.now() < suppressPaymentErrorUntilRef.current);

	const validateBeforePay = () => {
		if (!selectedOption) {
			onValidationError("amount", labels.selectAmount);
			return false;
		}
		if (!allowInteract) {
			onValidationError("amount", labels.amountInvalid);
			return false;
		}
		return true;
	};

	const handlePaymentButtonClick = (_data, actions) => {
		if (!validateBeforePay()) {
			suppressNextPaymentError();
			return actions?.reject ? actions.reject() : false;
		}
		return actions?.resolve ? actions.resolve() : true;
	};

	const buildPurchaseUnits = () => {
		const confirmation = reservation?.confirmation_number || "";
		const guest = reservation?.customer_details || {};
		const hotelName = reservation?.hotelName || reservation?.hotelId?.hotelName || "Jannat Booking";
		const invoiceId = `JB-${confirmation || reservation?._id || "reservation"}-${Date.now().toString(36)}`.slice(0, 127);
		return [
			{
				reference_id: "default",
				invoice_id: invoiceId,
				custom_id: confirmation,
				description: truncatePayPalText(
					`Jannat Booking reservation - ${hotelName} - ${selectedOption.label} - ${guest.name || "Guest"}`
				),
				amount: {
					currency_code: "USD",
					value: selectedUsdAmount,
					breakdown: {
						item_total: {
							currency_code: "USD",
							value: selectedUsdAmount,
						},
					},
				},
				items: [
					{
						name: truncatePayPalText(`${hotelName} - ${selectedOption.label}`),
						description: truncatePayPalText(
							`Guest: ${guest.name || "Guest"}, Phone: ${guest.phone || "n/a"}, Email: ${guest.email || "n/a"}, Conf: ${confirmation}`
						),
						quantity: "1",
						unit_amount: {
							currency_code: "USD",
							value: selectedUsdAmount,
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
			const error = new Error("");
			error.silent = true;
			throw error;
		}
		const orderPayload = {
			intent: "CAPTURE",
			purchase_units: buildPurchaseUnits(),
			application_context: {
				user_action: "PAY_NOW",
				shipping_preference: "NO_SHIPPING",
				brand_name: "Jannat Booking",
			},
		};
		if (actions?.order?.create) return actions.order.create(orderPayload);
		const serverOrder = await createPayPalOrder({
			...orderPayload,
			payment_source: {
				card: { attributes: { vault: { store_in_vault: "ON_SUCCESS" } } },
			},
		});
		if (!serverOrder?.id) throw new Error(labels.paymentFailed);
		return serverOrder.id;
	};

	const createApplePayOrder = async () => {
		if (!validateBeforePay()) {
			suppressNextPaymentError();
			const error = new Error("");
			error.silent = true;
			throw error;
		}
		const serverOrder = await createPayPalOrder({
			intent: "CAPTURE",
			purchase_units: buildPurchaseUnits(),
			application_context: {
				user_action: "PAY_NOW",
				shipping_preference: "NO_SHIPPING",
				brand_name: "Jannat Booking",
			},
		});
		if (!serverOrder?.id) throw new Error(labels.paymentFailed);
		return serverOrder.id;
	};

	const onApprove = async (data) => {
		try {
			await onPayApproved({
				option: selectedOption.paypalOption,
				convertedAmounts: {
					depositUSD: selectedUsdAmount,
					totalUSD: totalUsdAmount || selectedUsdAmount,
				},
				sarAmount: toMoney(selectedOption.sarAmount).toFixed(2),
				paypal: {
					order_id: data?.orderID || data?.orderId || data?.id,
					expectedUsdAmount: selectedUsdAmount,
					cmid: paypalMetaId(),
					mode: "capture",
				},
			});
		} catch (error) {
			message.open({
				key: "client-payment-error",
				type: "error",
				content: error?.response?.message || error?.message || labels.paymentFailed,
				duration: 5,
			});
		}
	};

	if (!allowInteract) return null;

	if (isRejected) {
		return (
			<div className="paypal-box">
				<Alert type="error" showIcon message={labels.moduleFailed} description={labels.moduleFailedCopy} />
				<div className="paypal-recovery-actions">
					{!walletOnly ? (
						<Button type="primary" onClick={onUseWalletOnly}>
							{labels.walletOnly}
						</Button>
					) : null}
					<Button onClick={onReloadPayment}>{labels.reloadPayment}</Button>
				</div>
			</div>
		);
	}

	const chargeLabel = (
		<PaymentAmount
			sarAmount={selectedOption.sarAmount}
			usdAmount={selectedUsdAmount}
			formatCurrency={formatCurrency}
			selectedCurrency={selectedCurrency}
		/>
	);

	return (
		<div className="paypal-box">
			<div className="amount-bar">
				<span>{labels.payNow}</span>
				{chargeLabel}
			</div>
			<PayPalStatus />
			<PayPalButtons
				fundingSource="paypal"
				style={{ layout: "vertical", label: "paypal" }}
				onClick={handlePaymentButtonClick}
				createOrder={createOrder}
				onApprove={onApprove}
				onError={(error) => {
					if (!shouldSuppressPaymentError(error)) {
						message.open({
							key: "client-payment-error",
							type: "error",
							content: error?.message || labels.paymentFailed,
							duration: 5,
						});
					}
				}}
				disabled={!allowInteract}
			/>
			<PayPalButtons
				fundingSource="card"
				style={{ layout: "vertical", label: "pay" }}
				onClick={handlePaymentButtonClick}
				createOrder={createOrder}
				onApprove={onApprove}
				onError={(error) => {
					if (!shouldSuppressPaymentError(error)) {
						message.open({
							key: "client-payment-error",
							type: "error",
							content: error?.message || labels.paymentFailed,
							duration: 5,
						});
					}
				}}
				disabled={!allowInteract}
			/>
			<div className="paypal-powered-note">
				{labels.poweredBy} <b>PayPal</b>
			</div>
			<ApplePayClientPaymentButton
				allowInteract={allowInteract}
				labels={labels}
				isArabic={isArabic}
				selectedUsdAmount={selectedUsdAmount}
				createApplePayOrder={createApplePayOrder}
				onApplePayApproved={onApprove}
				onBeforeStart={validateBeforePay}
				chargeLabel={chargeLabel}
			/>
			{isResolved && !walletOnly ? (
				cardFieldsStatus === "ready" ? (
					<div className="paypal-card-fields-panel" dir={isArabic ? "rtl" : "ltr"}>
						<div className="paypal-card-fields-head">
							<CreditCard size={18} />
							<div>
								<strong>{labels.cardTitle}</strong>
								<span>{labels.cardCopy}</span>
							</div>
						</div>
						<PayPalCardFieldsProvider
							createOrder={createOrder}
							onApprove={onApprove}
							onError={(error) => {
								if (!shouldSuppressPaymentError(error)) {
									message.open({
										key: "client-payment-error",
										type: "error",
										content: error?.message || labels.paymentFailed,
										duration: 5,
									});
								}
							}}
						>
							<PayPalCardFieldsForm>
								<div className="paypal-card-field full">
									<label>{isArabic ? "اسم حامل البطاقة" : "Cardholder name"}</label>
									<div className="paypal-hosted-field">
										<PayPalNameField />
									</div>
								</div>
								<div className="paypal-card-field full">
									<label>{isArabic ? "رقم البطاقة" : "Card number"}</label>
									<div className="paypal-hosted-field">
										<PayPalNumberField />
									</div>
								</div>
								<div className="paypal-card-fields-row">
									<div className="paypal-card-field">
										<label>{isArabic ? "تاريخ الانتهاء" : "Expiry date"}</label>
										<div className="paypal-hosted-field">
											<PayPalExpiryField />
										</div>
									</div>
									<div className="paypal-card-field">
										<label>{isArabic ? "رمز CVV" : "CVV"}</label>
										<div className="paypal-hosted-field">
											<PayPalCVVField />
										</div>
									</div>
								</div>
							</PayPalCardFieldsForm>
							<CardFieldsSubmitButton
								allowInteract={allowInteract}
								labels={{
									pay: labels.payByCard,
									processing: labels.processing,
									incomplete: labels.cardIncomplete,
									failed: labels.paymentFailed,
								}}
								onBeforeSubmit={validateBeforePay}
								shouldSuppressError={shouldSuppressPaymentError}
							/>
						</PayPalCardFieldsProvider>
					</div>
				) : cardFieldsStatus === "checking" ? (
					<div className="paypal-card-fields-panel paypal-card-fields-loading" dir={isArabic ? "rtl" : "ltr"}>
						<div className="paypal-card-fields-head">
							<CreditCard size={18} />
							<div>
								<strong>{labels.cardTitle}</strong>
								<span>{isArabic ? "\u062c\u0627\u0631\u064a \u062a\u062c\u0647\u064a\u0632 \u062d\u0642\u0648\u0644 \u0627\u0644\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0622\u0645\u0646\u0629..." : "Preparing secure card fields..."}</span>
							</div>
						</div>
						<div className="paypal-loading compact">
							<Spin />
						</div>
					</div>
				) : (
					<Alert
						type="info"
						showIcon
						className="paypal-card-fields-unavailable"
						message={labels.cardUnavailable}
						description={labels.cardUnavailableCopy}
					/>
				)
			) : null}
		</div>
	);
}

export default function ClientPaymentLinkClient({
	reservation,
	reservationId,
	confirmation,
	requestedAmountSar = null,
}) {
	const router = useRouter();
	const { message } = AntdApp.useApp();
	const {
		language,
		isArabic,
		hrefWithLanguage,
		setAuthSession,
		currency,
		formatCurrency,
		isSignedIn,
	} = useJannatApp();
	const labels = text[isArabic ? "ar" : "en"];
	const detailLabels = isArabic
		? {
				rooms: "الغرف المحجوزة",
				nights: "عدد الليالي",
				night: "ليلة",
				nightsWord: "ليلة",
				gregorianDates: "التاريخ الميلادي",
				hijriDates: "التاريخ الهجري",
				from: "من",
				to: "إلى",
				roomCount: "غرفة",
			}
		: {
				rooms: "Reserved rooms",
				nights: "Nights",
				night: "night",
				nightsWord: "nights",
				gregorianDates: "Gregorian dates",
				hijriDates: "Hijri dates",
				from: "From",
				to: "To",
				roomCount: "room",
			};
	const [selectedOptionId, setSelectedOptionId] = useState("");
	const [guestAgreed, setGuestAgreed] = useState(false);
	const [issueField, setIssueField] = useState("");
	const [usdByOption, setUsdByOption] = useState({});
	const [totalUsdAmount, setTotalUsdAmount] = useState("");
	const [conversionLoading, setConversionLoading] = useState(false);
	const [conversionError, setConversionError] = useState(false);
	const [paypalToken, setPaypalToken] = useState(null);
	const [paypalLoading, setPaypalLoading] = useState(false);
	const [walletOnly, setWalletOnly] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const [submitting, setSubmitting] = useState(false);
	const paymentLinkViewTrackedRef = useRef(false);
	const accountRecoveryAttemptedRef = useRef(false);

	const mismatch =
		reservation?.confirmation_number &&
		confirmation &&
		String(reservation.confirmation_number).toLowerCase() !== String(confirmation).toLowerCase();
	const hasReservation = Boolean(reservation?._id && reservation?.confirmation_number && !mismatch);
	const totalSar = toMoney(reservation?.total_amount || 0);
	const paidSar = toMoney(reservation?.paid_amount || 0);
	const remainingSar = toMoney(Math.max(totalSar - paidSar, 0));
	const isFullyPaid = hasReservation && totalSar > 0 && remainingSar <= 0.009;
	const requestedSar = toMoney(requestedAmountSar || 0);
	const cappedRequestedSar = requestedSar > 0 ? toMoney(Math.min(requestedSar, remainingSar || requestedSar)) : 0;
	const guest = reservation?.customer_details || {};
	const hotelName = reservation?.hotelName || reservation?.hotelId?.hotelName || "Jannat Booking";
	const invoiceHref = hrefWithLanguage(`/single-reservation/${reservation?.confirmation_number || confirmation || ""}`);
	const reservedRooms = useMemo(() => summarizeReservedRooms(reservation), [reservation]);
	const nightsCount = computeReservationNights(reservation);
	const nightsText = nightsCount
		? `${nightsCount.toLocaleString(isArabic ? "ar-EG-u-nu-latn" : "en-US")} ${
				nightsCount === 1 ? detailLabels.night : detailLabels.nightsWord
			}`
		: "-";
	const gregorianDates = {
		from: formatIsoDate(reservation?.checkin_date, language),
		to: formatIsoDate(reservation?.checkout_date, language),
	};
	const hijriDates = {
		from: formatHijriDate(reservation?.checkin_date, language),
		to: formatHijriDate(reservation?.checkout_date, language),
	};

	const paymentOptions = useMemo(() => {
		if (!hasReservation || isFullyPaid || !(remainingSar > 0)) return [];
		if (cappedRequestedSar > 0) {
			return [
				{
					id: "requested",
					label: labels.requestedAmount,
					sarAmount: cappedRequestedSar,
					paypalOption: cappedRequestedSar >= remainingSar - 0.009 ? "full" : "deposit",
				},
			];
		}
		if (paidSar > 0) {
			return [
				{
					id: "remaining",
					label: labels.remainingAmount,
					sarAmount: remainingSar,
					paypalOption: "full",
				},
			];
		}
		const deposit = toMoney(Math.min(computeDepositSar(reservation), remainingSar));
		return [
			{
				id: "deposit",
				label: labels.deposit,
				sarAmount: deposit > 0 ? deposit : toMoney(totalSar * 0.15),
				paypalOption: "deposit",
			},
			{
				id: "full",
				label: labels.fullAmount,
				sarAmount: remainingSar,
				paypalOption: "full",
			},
		].filter((option) => option.sarAmount > 0);
	}, [cappedRequestedSar, hasReservation, isFullyPaid, labels, paidSar, remainingSar, reservation, totalSar]);

	useEffect(() => {
		if (!paymentOptions.length) {
			setSelectedOptionId("");
			return;
		}
		setSelectedOptionId((current) => (paymentOptions.some((option) => option.id === current) ? current : paymentOptions[0].id));
	}, [paymentOptions]);

	useEffect(() => {
		let cancelled = false;
		const loadConversions = async () => {
			if (!paymentOptions.length) {
				setUsdByOption({});
				setTotalUsdAmount("");
				setConversionError(false);
				return;
			}
			setConversionLoading(true);
			setConversionError(false);
			try {
				const amounts = [...paymentOptions.map((option) => option.sarAmount), totalSar || remainingSar];
				const rows = await currencyConversion(amounts);
				if (cancelled) return;
				const next = {};
				paymentOptions.forEach((option, index) => {
					const usd = Number(rows?.[index]?.amountInUSD);
					if (!(usd > 0)) throw new Error("Invalid USD conversion.");
					next[option.id] = usd.toFixed(2);
				});
				const totalUsd = Number(rows?.[paymentOptions.length]?.amountInUSD);
				setUsdByOption(next);
				setTotalUsdAmount(totalUsd > 0 ? totalUsd.toFixed(2) : next[paymentOptions[paymentOptions.length - 1]?.id] || "");
			} catch (error) {
				console.error("Client payment conversion failed:", error);
				if (!cancelled) {
					setUsdByOption({});
					setTotalUsdAmount("");
					setConversionError(true);
				}
			} finally {
				if (!cancelled) setConversionLoading(false);
			}
		};
		loadConversions();
		return () => {
			cancelled = true;
		};
	}, [paymentOptions, remainingSar, totalSar]);

	useEffect(() => {
		let cancelled = false;
		const loadPayPalToken = async () => {
			if (!paymentOptions.length) return;
			setPaypalLoading(true);
			try {
				const token = await getPayPalClientToken();
				if (!cancelled) {
					setPaypalToken(token);
					setWalletOnly(false);
				}
			} catch (error) {
				console.error("Client payment PayPal token failed:", error);
				if (!cancelled) setPaypalToken(null);
			} finally {
				if (!cancelled) setPaypalLoading(false);
			}
		};
		loadPayPalToken();
		return () => {
			cancelled = true;
		};
	}, [paymentOptions.length, reloadKey]);

	const selectedOption = paymentOptions.find((option) => option.id === selectedOptionId) || null;
	const selectedUsdAmount = selectedOption ? usdByOption[selectedOption.id] || "" : "";
	const canPreparePayment =
		hasReservation &&
		selectedOption &&
		guestAgreed &&
		!conversionLoading &&
		!conversionError &&
		isPositive(selectedUsdAmount) &&
		!submitting;

	useEffect(() => {
		if (
			!hasReservation ||
			!isFullyPaid ||
			isSignedIn ||
			accountRecoveryAttemptedRef.current
		) {
			return;
		}
		accountRecoveryAttemptedRef.current = true;
		recoverReservationPaymentAccountSession({
			reservationId: reservation?._id || reservationId,
			confirmation: reservation?.confirmation_number || confirmation,
		})
			.then((response) => {
				if (response?.accountSession?.token && response?.accountSession?.user?._id) {
					setAuthSession(response.accountSession);
				}
			})
			.catch((error) => {
				console.warn("Client payment account recovery skipped:", error?.message || error);
			});
	}, [
		confirmation,
		hasReservation,
		isFullyPaid,
		isSignedIn,
		reservation?._id,
		reservation?.confirmation_number,
		reservationId,
		setAuthSession,
	]);

	useEffect(() => {
		if (paymentLinkViewTrackedRef.current || !hasReservation || isFullyPaid) return;
		paymentLinkViewTrackedRef.current = true;
		trackConversion(
			"paymentLinkView",
			{
				transaction_id: reservation?.confirmation_number || confirmation || reservationId,
				content_name: hotelName,
				content_type: "reservation_payment_link",
				value: remainingSar || totalSar || undefined,
				currency: remainingSar || totalSar ? "SAR" : undefined,
				checkout_context: "client_payment_link",
			},
			["Client Payment Link Viewed"]
		);
	}, [confirmation, hasReservation, hotelName, isFullyPaid, remainingSar, reservation?.confirmation_number, reservationId, totalSar]);

	const focusIssue = useCallback((field) => {
		setIssueField(field);
		window.requestAnimationFrame(() => {
			const selector =
				field === "terms"
					? '[data-client-payment-field="terms"]'
					: '[data-client-payment-field="amount"]';
			const element = document.querySelector(selector);
			element?.scrollIntoView?.({ behavior: "smooth", block: "center" });
			const focusTarget = element?.querySelector?.("button, input, [tabindex]") || element;
			focusTarget?.focus?.({ preventScroll: true });
		});
	}, []);

	const showValidationError = useCallback(
		(field, content) => {
			focusIssue(field);
			message.open({
				key: VALIDATION_KEY,
				type: "error",
				content,
				duration: 4,
			});
		},
		[focusIssue, message]
	);

	const toggleGuestAgreement = useCallback(
		(nextValue = !guestAgreed) => {
			setGuestAgreed(nextValue);
			if (nextValue && issueField === "terms") setIssueField("");
		},
		[guestAgreed, issueField]
	);

	const validatePaymentReadiness = useCallback(() => {
		if (!selectedOption) {
			showValidationError("amount", labels.selectAmount);
			return false;
		}
		if (!guestAgreed) {
			showValidationError("terms", labels.acceptTerms);
			return false;
		}
		if (!isPositive(selectedUsdAmount)) {
			showValidationError("amount", labels.amountInvalid);
			return false;
		}
		setIssueField("");
		return true;
	}, [guestAgreed, labels, selectedOption, selectedUsdAmount, showValidationError]);

	const handlePayApproved = async (paypalPayload) => {
		if (!validatePaymentReadiness()) return;
		setSubmitting(true);
		try {
			const response = await payReservationViaPayPalLink({
				reservationKey: reservation?._id || reservationId || reservation?.confirmation_number,
				option: paypalPayload.option,
				convertedAmounts: paypalPayload.convertedAmounts,
				sarAmount: paypalPayload.sarAmount,
				paypal: paypalPayload.paypal,
			});
			if (response?.accountSession?.token && response?.accountSession?.user?._id) {
				setAuthSession(response.accountSession);
			}
			const updated = response?.reservation || reservation;
			message.success(labels.paymentSuccess);
			trackConversion(
				"reservationPayment",
				{
					transaction_id: updated?.confirmation_number || reservation?.confirmation_number || confirmation || reservationId,
					content_name: hotelName,
					content_type: "reservation_payment_link",
					checkout_context: "client_payment_link",
					payment_type: selectedOption?.paypalOption || selectedOption?.id || paypalPayload.option,
					value: paypalPayload.sarAmount || selectedOption?.sarAmount || 0,
					currency: "SAR",
					paypal_currency: "USD",
					paypal_value: selectedUsdAmount,
				},
				["Client Payment Link Paid", "Reservation Paid"]
			);
			const params = new URLSearchParams({
				name: updated?.customer_details?.name || guest?.name || "Guest",
				total_price: String(toMoney(updated?.total_amount || totalSar)),
				total_rooms: String(updated?.total_rooms || reservation?.total_rooms || 1),
				confirmation_number: updated?.confirmation_number || reservation?.confirmation_number || confirmation || "",
				reservationId: updated?._id || reservation?._id || reservationId || "",
				paid: "1",
				invoice: "1",
				lang: language,
			});
			if (response?.accountSession?.token && response?.accountSession?.user?._id) {
				const dashboardParams = new URLSearchParams({
					reservation: updated?.confirmation_number || reservation?.confirmation_number || confirmation || "",
					paid: "1",
				});
				router.push(hrefWithLanguage(`/dashboard?${dashboardParams.toString()}`));
				return;
			}
			router.push(`/reservation-confirmed?${params.toString()}`);
		} catch (error) {
			console.error("Client payment failed:", error);
			message.open({
				key: "client-payment-error",
				type: "error",
				content: error?.response?.message || error?.message || labels.paymentFailed,
				duration: 5,
			});
		} finally {
			setSubmitting(false);
		}
	};

	const paypalClientId =
		paypalToken?.clientId ||
		paypalToken?.client_id ||
		(paypalToken?.env === "live"
			? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE
			: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_SANDBOX);

	if (!reservation || !reservation?._id) {
		return (
			<section className="section client-payment-page">
				<div className="container client-payment-empty premium-card">
					<LockKeyhole size={38} />
					<p className="eyebrow">{labels.eyebrow}</p>
					<h1>{labels.notFoundTitle}</h1>
					<p>{labels.notFoundCopy}</p>
					<Link className="btn btn-primary" href={hrefWithLanguage("/contact")}>
						{labels.contactSupport}
					</Link>
				</div>
			</section>
		);
	}

	if (mismatch) {
		return (
			<section className="section client-payment-page">
				<div className="container client-payment-empty premium-card">
					<LockKeyhole size={38} />
					<p className="eyebrow">{labels.eyebrow}</p>
					<h1>{labels.mismatchTitle}</h1>
					<p>{labels.mismatchCopy}</p>
					<Link className="btn btn-primary" href={hrefWithLanguage("/contact")}>
						{labels.contactSupport}
					</Link>
				</div>
			</section>
		);
	}

	return (
		<section className="section client-payment-page" dir={isArabic ? "rtl" : "ltr"}>
			<div className="container client-payment-layout">
				<div className="client-payment-summary premium-card">
					<p className="eyebrow">{labels.reservation}</p>
					<h1>{labels.title}</h1>
					<p>{labels.copy}</p>
					<div className="client-payment-facts">
						<span>
							<Hotel size={17} />
							<strong>{labels.hotel}</strong>
							<em>{hotelName}</em>
						</span>
						<span>
							<UserRound size={17} />
							<strong>{labels.guest}</strong>
							<em>{guest?.name || "-"}</em>
						</span>
						<span>
							<ReceiptText size={17} />
							<strong>{labels.confirmation}</strong>
							<em dir="ltr" className="ltr-value">{reservation.confirmation_number}</em>
						</span>
						<span>
							<CalendarDays size={17} />
							<strong>{detailLabels.nights}</strong>
							<em>{nightsText}</em>
						</span>
					</div>
					<div className="client-payment-reservation-details">
						{reservedRooms.length ? (
							<div className="client-payment-detail-row client-payment-room-row">
								<strong>
									<BedDouble size={16} />
									{detailLabels.rooms}
								</strong>
								<div className="client-payment-room-chips">
									{reservedRooms.map((room) => (
										<span key={`${room.name}-${room.count}`} className="client-payment-room-chip">
											<em>{room.name}</em>
											<small>
												{room.count.toLocaleString(isArabic ? "ar-EG-u-nu-latn" : "en-US")} {detailLabels.roomCount}
											</small>
										</span>
									))}
								</div>
							</div>
						) : null}
						<div className="client-payment-detail-row">
							<strong>
								<CalendarDays size={16} />
								{detailLabels.gregorianDates}
							</strong>
							<span className="client-payment-date-pair" dir={isArabic ? "rtl" : "ltr"}>
								<span>
									<small>{detailLabels.from}</small>
									<bdi dir="auto">{gregorianDates.from}</bdi>
								</span>
								<span>
									<small>{detailLabels.to}</small>
									<bdi dir="auto">{gregorianDates.to}</bdi>
								</span>
							</span>
						</div>
						<div className="client-payment-detail-row">
							<strong>
								<CalendarDays size={16} />
								{detailLabels.hijriDates}
							</strong>
							<span className="client-payment-date-pair" dir={isArabic ? "rtl" : "ltr"}>
								<span>
									<small>{detailLabels.from}</small>
									<bdi dir="auto">{hijriDates.from}</bdi>
								</span>
								<span>
									<small>{detailLabels.to}</small>
									<bdi dir="auto">{hijriDates.to}</bdi>
								</span>
							</span>
						</div>
					</div>
					<div className="client-payment-ledger">
						<span>
							<strong>{labels.total}</strong>
							<em dir="ltr">SAR {totalSar.toLocaleString("en-US", { minimumFractionDigits: 2 })}</em>
						</span>
						<span>
							<strong>{labels.paid}</strong>
							<em dir="ltr">SAR {paidSar.toLocaleString("en-US", { minimumFractionDigits: 2 })}</em>
						</span>
						<span className="remaining">
							<strong>{labels.remaining}</strong>
							<em dir="ltr">SAR {remainingSar.toLocaleString("en-US", { minimumFractionDigits: 2 })}</em>
						</span>
					</div>
					<div className="client-payment-assurances">
						<span>
							<ShieldCheck size={16} />
							{labels.accountNote}
						</span>
						<span>
							<FileText size={16} />
							{labels.receiptNote}
						</span>
					</div>
				</div>

				<div className="client-payment-panel premium-card">
					{isFullyPaid ? (
						<div className="client-payment-paid">
							<CheckCircle2 size={44} />
							<h2>{labels.alreadyPaidTitle}</h2>
							<p>{labels.alreadyPaidCopy}</p>
							<div className="hero-actions">
								<Link className="btn btn-primary" href={invoiceHref}>
									{labels.viewInvoice}
								</Link>
								<Link className="btn btn-ghost" href={hrefWithLanguage("/dashboard")}>
									{labels.openDashboard}
								</Link>
							</div>
						</div>
					) : (
						<>
							<div className="client-payment-panel-head">
								<p className="eyebrow">{labels.eyebrow}</p>
								<h2>{labels.chooseAmount}</h2>
							</div>
							<div
								className={`client-payment-options${issueField === "amount" ? " client-payment-attention" : ""}`}
								data-client-payment-field="amount"
							>
								{paymentOptions.map((option) => {
									const usdAmount = usdByOption[option.id] || "";
									const selected = option.id === selectedOptionId;
									return (
										<button
											type="button"
											key={option.id}
											className={selected ? "selected" : ""}
											onClick={() => {
												setSelectedOptionId(option.id);
												trackConversion(
													"paymentOption",
													{
														transaction_id: reservation?.confirmation_number || confirmation || reservationId,
														payment_type: option.id,
														checkout_context: "client_payment_link",
														value: option.sarAmount,
														currency: "SAR",
													},
													["Client Payment Amount Selected"]
												);
												if (issueField === "amount") setIssueField("");
											}}
										>
											<span className="radio-dot" />
											<span>
												<strong>{option.label}</strong>
												{usdAmount ? (
													<PaymentAmount
														sarAmount={option.sarAmount}
														usdAmount={usdAmount}
														formatCurrency={formatCurrency}
														selectedCurrency={currency}
													/>
												) : (
													<small>{conversionLoading ? <Spin size="small" /> : labels.conversionUnavailable}</small>
												)}
											</span>
										</button>
									);
								})}
							</div>
							<div
								className={`client-payment-terms${issueField === "terms" ? " client-payment-attention" : ""}`}
								data-client-payment-field="terms"
							>
								<button
									type="button"
									className="client-payment-checkbox"
									role="checkbox"
									aria-checked={guestAgreed}
									onPointerDown={(event) => {
										if (["mouse", "pen", "touch"].includes(event.pointerType)) {
											event.preventDefault();
											toggleGuestAgreement();
										}
									}}
									onKeyDown={(event) => {
										if (event.key === " " || event.key === "Enter") {
											event.preventDefault();
											toggleGuestAgreement();
										}
									}}
								>
									<span className="client-payment-checkmark" aria-hidden="true" />
									<span>{labels.terms}</span>
								</button>
							</div>
							{conversionError ? (
								<Alert type="error" showIcon message={labels.conversionUnavailable} />
							) : paypalLoading || conversionLoading ? (
								<div className="paypal-loading">
									<Spin />
								</div>
							) : paypalClientId ? (
								<PayPalScriptProvider
									key={`${paypalClientId}-${paypalToken?.env || "env"}-${walletOnly ? "wallet" : "full"}-${reloadKey}-${language}`}
									options={{
										"client-id": paypalClientId,
										...(paypalToken?.clientToken && !walletOnly ? { "data-client-token": paypalToken.clientToken } : {}),
										components: `${paypalToken?.clientToken && !walletOnly ? "buttons,card-fields" : "buttons"},applepay`,
										currency: "USD",
										intent: "capture",
										commit: true,
										"enable-funding": "paypal,card",
										"disable-funding": "credit,venmo,paylater",
										locale: isArabic ? "ar_EG" : "en_US",
									}}
								>
									<ClientPaymentButtons
										canPay={Boolean(canPreparePayment)}
										labels={labels}
										isArabic={isArabic}
										reservation={reservation}
										selectedOption={selectedOption}
										selectedUsdAmount={selectedUsdAmount}
										totalUsdAmount={totalUsdAmount}
										onPayApproved={handlePayApproved}
										onValidationError={showValidationError}
										walletOnly={walletOnly || !paypalToken?.clientToken}
										onUseWalletOnly={() => setWalletOnly(true)}
										onReloadPayment={() => {
											setWalletOnly(false);
											setReloadKey((current) => current + 1);
										}}
										formatCurrency={formatCurrency}
										selectedCurrency={currency}
									/>
								</PayPalScriptProvider>
							) : (
								<Alert type="error" showIcon message={labels.paypalUnavailable} />
							)}
							{!canPreparePayment && !conversionError ? (
								<Button
									type="primary"
									size="large"
									block
									className="client-payment-validate-button"
									loading={submitting}
									onClick={validatePaymentReadiness}
								>
									{labels.payNow}
								</Button>
							) : null}
						</>
					)}
				</div>
			</div>
		</section>
	);
}
