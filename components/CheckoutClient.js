"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App as AntdApp, Button, Checkbox, Form, Input, InputNumber, Spin } from "antd";
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { BedDouble, CalendarDays, CreditCard, Hotel, ShieldCheck, ShoppingCart, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackConversion } from "../lib/analyticsEvents";
import {
	cancelPayPalPendingReservation,
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
import { sar } from "../lib/format";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const normalizePhoneInput = (value = "") =>
	String(value || "")
		.replace(/[^\d\s+-]/g, "")
		.trim();

const passwordFromPhone = (phone = "") => normalizePhoneInput(phone).replace(/\s+/g, "");

const toMoney = (value) => Number(safeNumber(value, 0).toFixed(2));

const optionLabel = (option) => {
	if (option === "deposit") return "Deposit Paid";
	if (option === "full") return "Paid Online";
	return "Not Paid";
};

function PaymentOptions({
	acceptance = defaultGuestPaymentAcceptance,
	selected,
	setSelected,
	totalSar,
	totalUsd,
	isArabic,
	onTouched,
}) {
	const rows = [
		{
			key: "acceptDeposit",
			title: isArabic ? "دفع العربون أونلاين (15%)" : "Accept Deposit Online (15%)",
			amount: `${sar(totalSar * 0.15)} · USD ${toMoney(totalUsd * 0.15).toFixed(2)}`,
			enabled: acceptance.acceptDeposit !== false,
		},
		{
			key: "acceptPayWholeAmount",
			title: isArabic ? "دفع مبلغ الحجز بالكامل أونلاين" : "Pay Whole Amount Online",
			amount: `${sar(totalSar)} · USD ${toMoney(totalUsd).toFixed(2)}`,
			enabled: acceptance.acceptPayWholeAmount !== false,
		},
		{
			key: "acceptReserveNowPayInHotel",
			title: isArabic ? "احجز الآن وادفع في الفندق" : "Reserve Now, Pay in Hotel",
			amount: `${sar(totalSar * 1.1)} · USD ${toMoney(totalUsd * 1.1).toFixed(2)}`,
			enabled: acceptance.acceptReserveNowPayInHotel === true,
		},
	].filter((row) => row.enabled);

	if (!rows.length) {
		rows.push({
			key: "acceptDeposit",
			title: isArabic ? "دفع العربون أونلاين (15%)" : "Accept Deposit Online (15%)",
			amount: `${sar(totalSar * 0.15)} · USD ${toMoney(totalUsd * 0.15).toFixed(2)}`,
			enabled: true,
		});
	}

	return (
		<div className="payment-options">
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
				<small dir="ltr" className="ltr-value">{row.amount}</small>
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
}) {
	const { message } = AntdApp.useApp();
	const pendingRef = useRef({
		pendingReservationId: null,
		confirmation_number: null,
		invoice_id: null,
		payload: null,
	});

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
	const allowInteract = canPay && selectedUsdAmount > 0 && selectedSarAmount > 0;

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

	useEffect(() => () => cancelPending(), [cancelPending]);

	const ensurePendingReservation = async () => {
		if (pendingRef.current.pendingReservationId && pendingRef.current.confirmation_number) {
			return pendingRef.current;
		}
		const payload = getPendingReservationPayload?.();
		if (!payload) {
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
			invoice_id: `Jannat-${confirmation_number}-${Date.now().toString(36).slice(-6)}`.slice(0, 127),
			payload,
		};
		return pendingRef.current;
	};

	const validateBeforePay = () => {
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

	const createOrder = async (_data, actions) => {
		if (!validateBeforePay()) {
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
		return actions.order.create({
			intent: "CAPTURE",
			purchase_units: [
				{
					reference_id: "default",
					invoice_id: pending.invoice_id,
					custom_id: pending.confirmation_number,
					description: `Jannat Booking reservation - ${optionText}`.slice(0, 127),
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
							name: `Jannat Booking - ${optionText}`.slice(0, 127),
							quantity: "1",
							unit_amount: {
								currency_code: "USD",
								value: selectedUsdAmount.toFixed(2),
							},
							category: "DIGITAL_GOODS",
						},
					],
				},
			],
			application_context: {
				user_action: "PAY_NOW",
				shipping_preference: "NO_SHIPPING",
				brand_name: "Jannat Booking",
			},
		});
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
					order_id: data?.orderID,
					expectedUsdAmount: selectedUsdAmount.toFixed(2),
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
			await cancelPending();
			message.error(error?.message || (isArabic ? "تعذر إتمام الدفع." : "Payment could not be completed."));
		}
	};

	if (!allowInteract) return null;

	return (
		<div className="paypal-box">
			<div className="amount-bar">
				{isArabic ? "ستدفع الآن" : "You will pay now"}: <strong dir="ltr" className="ltr-value">SAR {selectedSarAmount.toFixed(2)} · USD {selectedUsdAmount.toFixed(2)}</strong>
			</div>
			<PayPalStatus />
			<PayPalButtons
				fundingSource="paypal"
				style={{ layout: "vertical", label: "paypal" }}
				createOrder={createOrder}
				onApprove={onApprove}
				onCancel={cancelPending}
				onError={async (error) => {
					await cancelPending();
					if (!error?.silent) {
						message.error(isArabic ? "حدث خطأ في PayPal." : "PayPal payment error.");
					}
				}}
				disabled={!allowInteract}
			/>
			<PayPalButtons
				fundingSource="card"
				style={{ layout: "vertical", label: "pay" }}
				createOrder={createOrder}
				onApprove={onApprove}
				onCancel={cancelPending}
				onError={async (error) => {
					await cancelPending();
					if (!error?.silent) {
						message.error(isArabic ? "حدث خطأ في الدفع بالبطاقة." : "Card payment error.");
					}
				}}
				disabled={!allowInteract}
			/>
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
		formatCurrency,
	} = useJannatApp();
	const [form] = Form.useForm();
	const [guestAgreed, setGuestAgreed] = useState(false);
	const [selectedPaymentOption, setSelectedPaymentOption] = useState("");
	const [convertedAmounts, setConvertedAmounts] = useState({
		totalUSD: "0.00",
		depositUSD: "0.00",
		totalRoomsPricePerNightUSD: "0.00",
	});
	const [paypalToken, setPaypalToken] = useState(null);
	const [loadingPayPal, setLoadingPayPal] = useState(false);
	const [submitting, setSubmitting] = useState(false);

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
		if (!selectedPaymentOption) {
			if (acceptance.acceptDeposit !== false) setSelectedPaymentOption("acceptDeposit");
			else if (acceptance.acceptPayWholeAmount !== false) setSelectedPaymentOption("acceptPayWholeAmount");
			else if (acceptance.acceptReserveNowPayInHotel) setSelectedPaymentOption("acceptReserveNowPayInHotel");
		}
	}, [acceptance.acceptDeposit, acceptance.acceptPayWholeAmount, acceptance.acceptReserveNowPayInHotel, selectedPaymentOption]);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			if (!totalSar) return;
			try {
				const rows = await currencyConversion([totalSar * 0.15, totalSar, totalSar]);
				const totalUSD = safeNumber(rows?.[1]?.amountInUSD, totalSar * 0.27);
				if (!cancelled) {
					setConvertedAmounts({
						depositUSD: toMoney(totalUSD * 0.15).toFixed(2),
						totalUSD: toMoney(totalUSD).toFixed(2),
						totalRoomsPricePerNightUSD: toMoney(safeNumber(rows?.[2]?.amountInUSD, totalSar * 0.27)).toFixed(2),
					});
				}
			} catch (error) {
				const fallbackUsd = totalSar * 0.27;
				if (!cancelled) {
					setConvertedAmounts({
						depositUSD: toMoney(fallbackUsd * 0.15).toFixed(2),
						totalUSD: toMoney(fallbackUsd).toFixed(2),
						totalRoomsPricePerNightUSD: toMoney(fallbackUsd).toFixed(2),
					});
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
				if (!cancelled) setPaypalToken(token);
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
				message.error(isArabic ? "السلة فارغة." : "Your cart is empty.");
				return null;
			}
			if (!oneHotelOnly) {
				message.error(isArabic ? "يرجى حجز غرف من فندق واحد فقط في كل طلب." : "Please book rooms from one hotel per reservation.");
				return null;
			}
			if (requirePaymentOption && !selectedPaymentOption) {
				message.error(isArabic ? "يرجى اختيار طريقة الدفع." : "Please choose how you would like to pay.");
				return null;
			}
			if (!guestAgreed) {
				message.error(isArabic ? "يرجى الموافقة على الشروط والأحكام." : "Please accept the Terms & Conditions.");
				return null;
			}
			const details = getCustomerDetails();
			if (!details.name || details.name.split(/\s+/).length < 2) {
				message.error(isArabic ? "يرجى كتابة الاسم الكامل." : "Please enter your full name, first and last name.");
				return null;
			}
			if (!/^\+?[0-9\s-]{5,}$/.test(details.phone)) {
				message.error(isArabic ? "يرجى كتابة رقم جوال صحيح." : "Please enter a valid phone number.");
				return null;
			}
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
				message.error(isArabic ? "يرجى كتابة بريد إلكتروني صحيح." : "Please enter a valid email address.");
				return null;
			}
			if (!details.nationality) {
				message.error(isArabic ? "يرجى كتابة الجنسية." : "Please add your nationality.");
				return null;
			}
			return details;
		},
		[cart.length, getCustomerDetails, guestAgreed, isArabic, oneHotelOnly, selectedPaymentOption]
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
			if (!(values.phone || values.email) || !cart.length) return;
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
		message.success(response?.message || (isArabic ? "تم إنشاء الحجز بنجاح." : "Reservation created successfully."));
		const reservation = response?.data || response?.reservation || {};
		trackConversion(
			"reservationRequest",
			{
				value: payload.total_amount,
				currency: "SAR",
				transaction_id:
					reservation.confirmation_number ||
					paypalPayload.confirmation_number ||
					reservation._id ||
					undefined,
				payment_type: option,
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
		clearCart();
		router.push(`/reservation-confirmed?${params.toString()}`);
	};

	const paypalClientId =
		paypalToken?.clientId ||
		paypalToken?.client_id ||
		(paypalToken?.env === "live"
			? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE
			: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_SANDBOX);

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
					<Form form={form} layout="vertical" requiredMark={false}>
						<Form.Item name="fullName" label={t("fullName")} rules={[{ required: true, message: t("fullName") }]}>
							<Input size="large" />
						</Form.Item>
						<Form.Item name="phone" label={t("phone")} rules={[{ required: true, message: t("phone") }]}>
							<Input size="large" dir="ltr" inputMode="tel" onChange={(event) => form.setFieldValue("phone", normalizePhoneInput(event.target.value))} />
						</Form.Item>
						<Form.Item name="email" label={t("emailAddress")} rules={[{ required: true, type: "email", message: t("emailAddress") }]}>
							<Input size="large" dir="ltr" type="email" />
						</Form.Item>
						<Form.Item name="nationality" label={isArabic ? "الجنسية" : "Nationality"} rules={[{ required: true, message: isArabic ? "الجنسية" : "Nationality" }]}>
							<Input size="large" />
						</Form.Item>
						<div className="checkout-mini-grid">
							<Form.Item name="passport" label={isArabic ? "رقم الجواز" : "Passport"} initialValue="Not Provided">
								<Input size="large" dir="ltr" />
							</Form.Item>
							<Form.Item name="passportExpiry" label={isArabic ? "انتهاء الجواز" : "Passport expiry"} initialValue="2029-12-20">
								<Input size="large" dir="ltr" placeholder="YYYY-MM-DD" />
							</Form.Item>
						</div>
						<Form.Item name="notes" label={t("notes")}>
							<Input.TextArea rows={3} placeholder={t("notesPlaceholder")} />
						</Form.Item>
					</Form>

					<PaymentOptions
						acceptance={acceptance}
						selected={selectedPaymentOption}
						setSelected={setSelectedPaymentOption}
						totalSar={totalSar}
						totalUsd={safeNumber(convertedAmounts.totalUSD, 0)}
						isArabic={isArabic}
						onTouched={createUncompletedDocument}
					/>
					<div className="terms-row">
						<Checkbox checked={guestAgreed} onChange={(event) => setGuestAgreed(event.target.checked)}>
							{isArabic ? "أوافق على الشروط والأحكام" : "I accept the Terms & Conditions"}
						</Checkbox>
					</div>
					{selectedPaymentOption === "acceptReserveNowPayInHotel" ? (
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
					) : paypalClientId ? (
						<PayPalScriptProvider
							options={{
								"client-id": paypalClientId,
								...(paypalToken?.clientToken ? { "data-client-token": paypalToken.clientToken } : {}),
								components: "buttons",
								currency: "USD",
								intent: "capture",
								commit: true,
								"enable-funding": "paypal,card",
								"disable-funding": "credit,venmo,paylater",
								locale: isArabic ? "ar_EG" : "en_US",
							}}
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
							return (
								<article key={`${item.id}-${item.checkIn}-${item.checkOut}`}>
									<div className="checkout-item-image">
										{item.image ? (
											<OptimizedImage
												src={item.image}
												alt={item.roomName}
												fill
												sizes="96px"
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
