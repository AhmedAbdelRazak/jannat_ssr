"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Headset, Send, X } from "lucide-react";
import { apiUrl, closePublicSupportCase, socketBaseUrl } from "../lib/api";
import { trackConversion } from "../lib/analyticsEvents";
import {
	mergeChatQueryParams,
	readChatQueryParams,
	replaceSearchWithoutReload,
} from "../lib/chatQueryParams";
import { ARABIC_BRAND_NAME, BRAND_NAME, CONTACT_EMAIL } from "../lib/constants";
import { titleCase } from "../lib/format";
import { useJannatApp } from "./JannatAppProvider";

const JANNAT_SUPPORT_HOTEL_ID = "674cf8997e3780f1f838d458";
const JANNAT_SUPPORTER_ID = "6553f1c6d06c5cea2f98a838";

const brandText = (value = "", isArabic = false) =>
	String(value || "")
		.replace(/Jannat Booking/gi, isArabic ? ARABIC_BRAND_NAME : BRAND_NAME)
		.replace(/support@jannatbooking\.com/gi, CONTACT_EMAIL);

const supportTopicOptions = (isArabic) => [
	{
		value: "reserve_room",
		label: isArabic ? "الغرف والأسعار والتوفر" : "Room pricing / availability",
	},
	{
		value: "reservation",
		label: isArabic ? "استفسار عن حجز قائم" : "Existing reservation question",
	},
	{
		value: "payment_inquiry",
		label: isArabic ? "الدفع أو الفاتورة" : "Payment or invoice",
	},
	{
		value: "hotel_service",
		label: isArabic ? "خدمات الفندق" : "Hotel services",
	},
	{
		value: "hotel_complaint",
		label: isArabic ? "شكوى أو مساعدة عاجلة" : "Complaint or urgent help",
	},
	{
		value: "others",
		label: isArabic ? "موضوع آخر" : "Something else",
	},
];

const quickRepliesForMessage = (message = {}) =>
	Array.isArray(message.quickReplies)
		? message.quickReplies
				.map((reply) => ({
					label: String(reply?.label || "").trim(),
					value: String(reply?.value || reply?.label || "").trim(),
					action: String(reply?.action || "").trim(),
				}))
				.filter((reply) => reply.label && reply.value)
				.slice(0, 4)
		: [];

const messageKey = (message = {}) =>
	message?._id ||
	message?.clientTag ||
	`${message?.date || ""}:${message?.messageBy?.customerEmail || ""}:${message?.message || ""}`;

export default function SupportWidget({ hotels = [] }) {
	const { t, isArabic } = useJannatApp();
	const [open, setOpen] = useState(false);
	const [caseId, setCaseId] = useState("");
	const [messages, setMessages] = useState([]);
	const [form, setForm] = useState({
		name: "",
		contact: "",
		hotelId: "",
		hotelName: "",
		topic: "reserve_room",
		message: "",
	});
	const [reply, setReply] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [typingStatus, setTypingStatus] = useState("");
	const socketRef = useRef(null);
	const typingTimerRef = useRef(null);
	const messagesContainerRef = useRef(null);
	const messagesEndRef = useRef(null);
	const replyInFlightRef = useRef(false);
	const languageName = isArabic ? "Arabic" : "English";
	const languageCode = isArabic ? "ar" : "en";
	const chatLabel = isArabic ? "دعم العملاء" : "Customer Support";
	const supportHotel = useMemo(
		() => ({
			_id: JANNAT_SUPPORT_HOTEL_ID,
			hotelName: isArabic ? ARABIC_BRAND_NAME : BRAND_NAME,
			belongsTo: JANNAT_SUPPORTER_ID,
		}),
		[isArabic]
	);
	const hotelOptions = useMemo(() => [supportHotel, ...hotels], [hotels, supportHotel]);
	const selectedHotel = useMemo(
		() => hotelOptions.find((hotel) => String(hotel._id) === String(form.hotelId)),
		[form.hotelId, hotelOptions]
	);
	const topics = useMemo(() => supportTopicOptions(isArabic), [isArabic]);
	const selectedTopic = useMemo(
		() => topics.find((topic) => topic.value === form.topic) || topics[0],
		[form.topic, topics]
	);

	const updateForm = (key, value) =>
		setForm((current) => ({
			...current,
			[key]: value,
		}));

	const writeChatQuery = useCallback(
		(fields = {}, options = {}) => {
			if (typeof window === "undefined") return;
			const nextSearch = mergeChatQueryParams(
				window.location.search,
				{
					language: languageName,
					...fields,
				},
				options
			);
			replaceSearchWithoutReload(nextSearch);
		},
		[languageName]
	);

	const commitChatQueryFields = useCallback(
		(fields = {}) => writeChatQuery(fields, { open: true }),
		[writeChatQuery]
	);

	const openChatPanel = useCallback(
		(fields = {}, legacyEvent = "Chat Window Opened_Main") => {
			setOpen(true);
			setError("");
			setNotice("");
			writeChatQuery(fields, { open: true });
			trackConversion(
				"chatOpen",
				{ source: "support_widget", inquiry: fields.inquiry || form.topic },
				[legacyEvent]
			);
		},
		[form.topic, writeChatQuery]
	);

	const closeChatPanel = useCallback(() => {
		setOpen(false);
		if (!caseId) {
			writeChatQuery({}, { close: true, clearFields: true });
			return;
		}
		const nextSearch = mergeChatQueryParams(window.location.search, {}, { close: true });
		replaceSearchWithoutReload(nextSearch);
	}, [caseId, writeChatQuery]);

	const resetCaseState = useCallback(() => {
		window.clearTimeout(typingTimerRef.current);
		setCaseId("");
		setMessages([]);
		setReply("");
		setTypingStatus("");
	}, []);

	useEffect(() => {
		const applyQueryState = () => {
			const queryState = readChatQueryParams(window.location.search);
			setOpen((current) => (current === queryState.isOpen ? current : queryState.isOpen));
			if (!queryState.isOpen || caseId) return;
			setForm((current) => ({
				...current,
				name: queryState.name || current.name,
				contact: queryState.contact || current.contact,
				hotelId: queryState.hotelId || current.hotelId,
				hotelName: queryState.hotelName || current.hotelName,
				topic: queryState.inquiry || current.topic || "reserve_room",
				message: queryState.inquiryDetails || current.message,
			}));
		};
		applyQueryState();
		window.addEventListener("popstate", applyQueryState);
		return () => window.removeEventListener("popstate", applyQueryState);
	}, [caseId]);

	useEffect(() => {
		const openSelectedHotelChat = (event) => {
			const detail = event?.detail || {};
			const hotelId = String(detail.hotelId || "");
			const nextFields = {
				hotelId,
				hotelName: detail.hotelName || "",
				inquiry: detail.topic || form.topic || "reserve_room",
				inquiryDetails: detail.message || "",
			};
			openChatPanel(nextFields, "Hotel Chat Opened");
			if (!caseId && (hotelId || detail.message)) {
				setForm((current) => ({
					...current,
					hotelId: hotelId || current.hotelId,
					hotelName: detail.hotelName || current.hotelName,
					topic: detail.topic || current.topic || "reserve_room",
					message: detail.message || current.message,
				}));
			}
		};
		window.addEventListener("jannat:open-support", openSelectedHotelChat);
		return () => window.removeEventListener("jannat:open-support", openSelectedHotelChat);
	}, [caseId, form.topic, openChatPanel]);

	useEffect(() => {
		if (!caseId || !open) return undefined;
		let cancelled = false;
		const load = async () => {
			try {
				const res = await fetch(apiUrl(`/support-cases/client/${caseId}`));
				const data = await res.json();
				if (!cancelled && data?.caseStatus === "closed") {
					resetCaseState();
					setNotice(t("chatClosed"));
					return;
				}
				if (!cancelled && Array.isArray(data?.conversation)) {
					setMessages(data.conversation);
				}
			} catch (err) {
				console.error(err);
			}
		};
		load();
		const timer = setInterval(load, 3500);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [caseId, open, resetCaseState, t]);

	useEffect(() => {
		if (!caseId || !open) return undefined;
		let mounted = true;
		let socket = null;

		const onReceiveMessage = (message = {}) => {
			if (message.caseId && String(message.caseId) !== String(caseId)) return;
			setTypingStatus("");
			setMessages((current) => {
				const key = messageKey(message);
				if (current.some((row) => messageKey(row) === key)) return current;
				return [...current, message];
			});
		};
		const onTyping = (data = {}) => {
			if (data.caseId && String(data.caseId) !== String(caseId)) return;
			if (data.name && data.name === form.name) return;
			setTypingStatus(
				isArabic
					? `${data.name || ARABIC_BRAND_NAME} يكتب الآن...`
					: `${data.name || BRAND_NAME} is typing...`
			);
			window.clearTimeout(typingTimerRef.current);
			typingTimerRef.current = window.setTimeout(() => setTypingStatus(""), 4500);
		};
		const onStopTyping = (data = {}) => {
			if (data.caseId && String(data.caseId) !== String(caseId)) return;
			setTypingStatus("");
		};
		const onCloseCase = (payload = {}) => {
			const closedCaseId = String(payload?.case?._id || payload?.caseId || "");
			if (closedCaseId && closedCaseId !== String(caseId)) return;
			resetCaseState();
			setNotice(t("chatClosed"));
		};

		const connectSocket = async () => {
			const { io } = await import("socket.io-client");
			if (!mounted) return;
			socket = io(socketBaseUrl, {
				transports: ["websocket", "polling"],
				withCredentials: false,
			});
			socketRef.current = socket;
			socket.emit("joinRoom", { caseId });
			socket.on("receiveMessage", onReceiveMessage);
			socket.on("typing", onTyping);
			socket.on("stopTyping", onStopTyping);
			socket.on("closeCase", onCloseCase);
		};

		connectSocket().catch((err) => console.error(err));

		return () => {
			mounted = false;
			window.clearTimeout(typingTimerRef.current);
			if (socket) {
				socket.emit("leaveRoom", { caseId });
				socket.off("receiveMessage", onReceiveMessage);
				socket.off("typing", onTyping);
				socket.off("stopTyping", onStopTyping);
				socket.off("closeCase", onCloseCase);
				socket.disconnect();
			}
			socketRef.current = null;
		};
	}, [caseId, form.name, isArabic, open, resetCaseState, t]);

	const scrollToBottom = useCallback((behavior = "smooth") => {
		const container = messagesContainerRef.current;
		if (container) {
			container.scrollTo({ top: container.scrollHeight, behavior });
			return;
		}
		messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
	}, []);

	useEffect(() => {
		if (!open || !caseId) return;
		const frame = window.requestAnimationFrame(() => scrollToBottom("auto"));
		const timer = window.setTimeout(() => scrollToBottom("auto"), 180);
		const lateTimer = window.setTimeout(() => scrollToBottom("auto"), 650);
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(timer);
			window.clearTimeout(lateTimer);
		};
	}, [caseId, messages.length, open, scrollToBottom, typingStatus]);

	const startChat = async (event) => {
		event.preventDefault();
		setError("");
		setNotice("");
		if (!form.name.trim() || !form.contact.trim() || !selectedHotel || !form.message.trim()) {
			setError(
				isArabic
					? "يرجى إضافة الاسم وبيانات التواصل والفندق والرسالة."
					: "Please add your name, contact, hotel, and message."
			);
			return;
		}
		const ownerId = String(selectedHotel?.belongsTo?._id || selectedHotel?.belongsTo || "").trim();
		if (!ownerId) {
			setError(isArabic ? "يرجى اختيار فندق من القائمة." : "Please choose a listed Jannat hotel.");
			return;
		}
		commitChatQueryFields({
			name: form.name,
			contact: form.contact,
			hotelId: selectedHotel._id,
			hotelName: selectedHotel.hotelName || form.hotelName,
			inquiry: selectedTopic?.value || "reserve_room",
			inquiryDetails: form.message,
			language: languageName,
		});
		setBusy(true);
		try {
			const payload = {
				customerName: form.name,
				displayName1: form.name,
				displayName2: selectedHotel.hotelName,
				role: 0,
				customerEmail: form.contact,
				hotelId: selectedHotel._id,
				inquiryAbout: selectedTopic?.value || "reserve_room",
				inquiryDetails: `[Preferred Language: ${languageName} (${languageCode})] [Topic: ${
					selectedTopic?.label || "Room booking or availability"
				}] ${form.message}`,
				supportScope:
					String(selectedHotel._id) === JANNAT_SUPPORT_HOTEL_ID
						? "jannat_booking"
						: "hotel",
				supporterId: ownerId,
				ownerId,
				preferredLanguage: languageName,
				preferredLanguageCode: languageCode,
				sourceWebsite: "jannatbooking_ssr",
				sourcePage: "jannatbooking_support_widget",
				sourceUrl: typeof window !== "undefined" ? window.location.href : "",
			};
			const res = await fetch(apiUrl("/support-cases/new"), {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await res.json();
			if (!res.ok || data?.error) throw new Error(data?.error || "Unable to start chat.");
			setCaseId(data._id);
			setMessages(Array.isArray(data.conversation) ? data.conversation : []);
			trackConversion(
				"chatStart",
				{
					content_name: selectedHotel.hotelName || form.hotelName,
					content_type: "support_case",
					hotel_id: selectedHotel._id,
					inquiry: selectedTopic?.value || "reserve_room",
				},
				["User Started Chat", "Start Chat"]
			);
		} catch (err) {
			setError(err.message || "Unable to start chat.");
		} finally {
			setBusy(false);
		}
	};

	const emitTyping = (value) => {
		const socket = socketRef.current;
		if (!socket || !caseId) return;
		if (value) {
			socket.emit("typing", { name: form.name || "Guest", caseId });
			window.clearTimeout(typingTimerRef.current);
			typingTimerRef.current = window.setTimeout(() => {
				socket.emit("stopTyping", { name: form.name || "Guest", caseId });
			}, 1600);
		} else {
			socket.emit("stopTyping", { name: form.name || "Guest", caseId });
		}
	};

	const sendReply = async (event, overrideText = "") => {
		event?.preventDefault?.();
		const messageText = String(overrideText || reply || "").trim();
		if (!caseId || !messageText || replyInFlightRef.current) return;
		replyInFlightRef.current = true;
		setBusy(true);
		setError("");
		setNotice("");
		try {
			const conversation = {
				messageBy: {
					customerName: form.name || "Guest",
					customerEmail: form.contact || "guest@jannatbooking.com",
				},
				message: messageText,
				inquiryAbout: "support",
				inquiryDetails: messageText,
				preferredLanguage: languageName,
				preferredLanguageCode: languageCode,
			};
			const res = await fetch(apiUrl(`/support-cases/client/${caseId}`), {
				method: "PUT",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				body: JSON.stringify({ conversation }),
			});
			const data = await res.json();
			if (!res.ok || data?.error) throw new Error(data?.error || "Message failed.");
			setMessages(Array.isArray(data.conversation) ? data.conversation : []);
			setReply("");
			emitTyping("");
		} catch (err) {
			if (/closed/i.test(err.message || "")) {
				resetCaseState();
				setNotice(t("chatClosed"));
				return;
			}
			setError(err.message || "Message failed.");
		} finally {
			replyInFlightRef.current = false;
			setBusy(false);
		}
	};

	const handleQuickReply = (quickReply) => {
		const value = String(quickReply?.value || quickReply?.label || "").trim();
		if (!value || busy) return;
		setReply("");
		sendReply(null, value);
	};

	const endChat = async () => {
		if (!caseId || busy) return;
		setBusy(true);
		setError("");
		try {
			await closePublicSupportCase(caseId);
			socketRef.current?.emit("leaveRoom", { caseId });
			resetCaseState();
			setNotice(t("chatClosed"));
		} catch (err) {
			setError(err.message || "Unable to close chat.");
		} finally {
			setBusy(false);
		}
	};

	const handleHotelChange = (value) => {
		const hotel = hotelOptions.find((row) => String(row._id) === String(value));
		updateForm("hotelId", value);
		setForm((current) => ({
			...current,
			hotelId: value,
			hotelName: hotel?.hotelName || "",
		}));
		commitChatQueryFields({
			hotelId: value,
			hotelName: hotel?.hotelName || "",
		});
	};

	return (
		<div className="support-root" dir={isArabic ? "rtl" : "ltr"}>
			<button
				className="support-button"
				type="button"
				onClick={() => openChatPanel({}, "Chat Window Opened_Main")}
				aria-label={chatLabel}
			>
				<Headset size={21} />
				<span className="support-status-dot" aria-hidden="true" />
				<span className="support-button-label">{chatLabel}</span>
			</button>
			{open ? (
				<section className="support-panel" aria-label="Jannat Booking support">
					<header className="support-head">
						<div className="support-head-copy">
							<strong>{isArabic ? ARABIC_BRAND_NAME : BRAND_NAME}</strong>
							<span>{isArabic ? "دعم الفنادق" : "Hotel support"}</span>
						</div>
						<div className="support-head-actions">
							{caseId ? (
								<button className="support-end-chat" type="button" onClick={endChat} disabled={busy}>
									{t("endChat")}
								</button>
							) : null}
							<button className="support-close" type="button" onClick={closeChatPanel} aria-label="Close support">
								<X size={20} />
							</button>
						</div>
					</header>
					{notice ? <p className="notice">{notice}</p> : null}
					{caseId ? (
						<>
							<div className="messages" ref={messagesContainerRef} role="log" aria-live="polite">
								{messages.map((message, index) => {
									const sender = brandText(message?.messageBy?.customerName || "Support", isArabic);
									const text = brandText(message?.message || "", isArabic);
									const isGuest =
										message?.messageBy?.customerEmail &&
										form.contact &&
										message.messageBy.customerEmail === form.contact;
									const quickReplies = quickRepliesForMessage(message);
									const showQuickReplies =
										!isGuest &&
										quickReplies.length > 0 &&
										index === messages.length - 1;
									return (
										<div className={`bubble ${isGuest ? "guest" : "agent"}`} key={`${index}-${messageKey(message)}`}>
											<span>{sender}</span>
											<p>{text}</p>
											{showQuickReplies ? (
												<div className="quick-replies">
													{quickReplies.map((quickReply) => (
														<button
															key={`${quickReply.action || quickReply.label}-${quickReply.value}`}
															type="button"
															className="quick-reply"
															onClick={() => handleQuickReply(quickReply)}
															disabled={busy}
														>
															{brandText(quickReply.label, isArabic)}
														</button>
													))}
												</div>
											) : null}
										</div>
									);
								})}
								{typingStatus ? <div className="typing-line">{typingStatus}</div> : null}
								<div ref={messagesEndRef} />
							</div>
							<form className="reply-form" onSubmit={sendReply}>
								<input
									value={reply}
									onChange={(event) => {
										setReply(event.target.value);
										emitTyping(event.target.value);
									}}
									placeholder={t("typeMessage")}
								/>
								<button type="submit" disabled={busy || !reply.trim()} aria-label="Send message">
									<Send size={18} />
								</button>
							</form>
						</>
					) : (
						<form className="start-form support-form" onSubmit={startChat}>
							<div className="field support-field">
								<label>{t("name")}</label>
								<input
									value={form.name}
									onChange={(event) => updateForm("name", event.target.value)}
									onBlur={(event) => commitChatQueryFields({ name: event.target.value })}
									autoComplete="name"
								/>
							</div>
							<div className="field support-field">
								<label>{t("contact")}</label>
								<input
									dir="ltr"
									value={form.contact}
									onChange={(event) => updateForm("contact", event.target.value)}
									onBlur={(event) => commitChatQueryFields({ contact: event.target.value })}
									autoComplete="email tel"
								/>
							</div>
							<div className="field support-field">
								<label>{t("hotel")}</label>
								<select value={form.hotelId} onChange={(event) => handleHotelChange(event.target.value)}>
									<option value="">{isArabic ? "اختر الفندق" : "Choose a hotel"}</option>
									{hotelOptions.map((hotel) => (
										<option key={hotel._id} value={hotel._id}>
											{titleCase(hotel.hotelName)}
										</option>
									))}
								</select>
							</div>
							<div className="field support-field">
								<label>{isArabic ? "نوع المساعدة" : "Support topic"}</label>
								<select
									value={form.topic}
									onChange={(event) => {
										updateForm("topic", event.target.value);
										commitChatQueryFields({ inquiry: event.target.value });
									}}
								>
									{topics.map((topic) => (
										<option key={topic.value} value={topic.value}>
											{topic.label}
										</option>
									))}
								</select>
							</div>
							<div className="field support-field">
								<label>{t("message")}</label>
								<textarea
									value={form.message}
									onChange={(event) => updateForm("message", event.target.value)}
									onBlur={(event) => commitChatQueryFields({ inquiryDetails: event.target.value })}
									placeholder={isArabic ? "اكتب الغرفة أو التواريخ التي تبحث عنها." : "Tell us the room or dates you are looking for."}
								/>
							</div>
							<button className="btn btn-primary" type="submit" disabled={busy}>
								{t("startChat")}
							</button>
						</form>
					)}
					{error ? <p className="error">{error}</p> : null}
				</section>
			) : null}
			<style jsx>{`
				.support-root {
					position: fixed;
					right: 18px;
					bottom: 18px;
					z-index: 90;
				}

				.support-button {
					min-height: 52px;
					border: 0;
					border-radius: 999px;
					padding: 0 20px;
					color: #fff;
					background:
						linear-gradient(135deg, rgba(255, 255, 255, 0.14), transparent 34%),
						linear-gradient(135deg, #071526 0%, #102033 42%, #0b8f6a 100%);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.18),
						0 16px 34px rgba(8, 9, 13, 0.3),
						0 0 0 1px rgba(55, 212, 156, 0.16);
					display: inline-flex;
					align-items: center;
					gap: 8px;
					font-weight: 950;
					cursor: pointer;
					position: relative;
					overflow: hidden;
					transition:
						transform 160ms ease,
						box-shadow 160ms ease,
						filter 160ms ease;
				}

				.support-button::before {
					content: "";
					position: absolute;
					inset: 1px;
					border-radius: inherit;
					background: linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 36%);
					pointer-events: none;
				}

				.support-button svg,
				.support-button span {
					position: relative;
					z-index: 1;
				}

				.support-button svg {
					stroke-width: 2.25;
					flex: 0 0 auto;
				}

				.support-button:hover {
					transform: translateY(-2px);
					filter: saturate(1.08);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.2),
						0 20px 42px rgba(8, 9, 13, 0.34),
						0 0 0 1px rgba(55, 212, 156, 0.2);
				}

				.support-status-dot {
					position: relative;
					width: 9px;
					height: 9px;
					border-radius: 999px;
					background: #37d49c;
					box-shadow: 0 0 12px rgba(55, 212, 156, 0.82);
					flex: 0 0 auto;
				}

				.support-status-dot::after {
					content: "";
					position: absolute;
					inset: -7px;
					border-radius: inherit;
					background: rgba(55, 212, 156, 0.26);
					animation: jannatChatPulse 1.5s ease-out infinite;
				}

				@keyframes jannatChatPulse {
					0% {
						opacity: 0.55;
						transform: scale(0.7);
					}
					72%,
					100% {
						opacity: 0;
						transform: scale(1.9);
					}
				}

				.support-panel {
					position: absolute;
					right: 0;
					bottom: 62px;
					width: min(410px, calc(100vw - 28px));
					max-height: min(720px, calc(100vh - 112px));
					display: flex;
					flex-direction: column;
					background: #fff;
					border: 1px solid rgba(36, 84, 125, 0.16);
					border-radius: 8px;
					overflow: hidden;
					box-shadow: 0 24px 55px rgba(8, 9, 13, 0.26);
				}

				.support-head {
					color: #fff;
					padding: 16px 18px;
					background: linear-gradient(135deg, var(--zad-blue), var(--zad-green));
					display: flex;
					justify-content: space-between;
					align-items: center;
					gap: 12px;
				}

				.support-head-copy {
					display: grid;
					gap: 3px;
				}

				.support-head strong,
				.support-head span {
					display: block;
				}

				.support-head strong {
					font-size: 16px;
					line-height: 1.15;
				}

				.support-head span {
					color: rgba(255, 255, 255, 0.78);
					font-size: 12px;
					font-weight: 850;
				}

				.support-head-actions {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					flex: 0 0 auto;
				}

				.support-end-chat,
				.support-close {
					border-radius: 8px;
					border: 1px solid rgba(255, 255, 255, 0.16);
					background: rgba(255, 255, 255, 0.1);
					color: #fff;
					cursor: pointer;
				}

				.support-end-chat {
					min-height: 34px;
					padding: 0 10px;
					font-size: 12px;
					font-weight: 950;
				}

				.support-close {
					width: 36px;
					height: 36px;
					display: inline-flex;
					align-items: center;
					justify-content: center;
				}

				.start-form,
				.messages {
					padding: 18px;
				}

				.start-form {
					display: grid;
					gap: 12px;
					background: #fff;
				}

				.support-field {
					display: grid;
					gap: 6px;
				}

				.support-field label {
					color: var(--zad-blue);
					font-size: 12px;
					font-weight: 950;
					line-height: 1.2;
				}

				.support-field input,
				.support-field select,
				.support-field textarea {
					width: 100%;
					border: 1px solid rgba(36, 84, 125, 0.18);
					border-radius: 8px;
					background: rgba(255, 255, 255, 0.96);
					color: var(--zad-ink);
					outline: none;
				}

				.support-field input,
				.support-field select {
					min-height: 46px;
					padding: 0 13px;
				}

				.support-field textarea {
					min-height: 92px;
					padding: 12px 13px;
					line-height: 1.55;
					resize: vertical;
				}

				.support-form .btn {
					width: 100%;
					min-height: 48px;
					margin-top: 2px;
				}

				.messages {
					flex: 1 1 auto;
					min-height: 260px;
					overflow-y: auto;
					display: flex;
					flex-direction: column;
					gap: 10px;
					scroll-behavior: smooth;
					background: #f7f8fb;
				}

				.bubble {
					max-width: 88%;
					border-radius: 8px;
					padding: 9px 10px;
					background: #fff;
					border: 1px solid var(--zad-border);
				}

				.bubble.guest {
					margin-left: auto;
					color: #fff;
					background: var(--zad-blue);
					border-color: var(--zad-blue);
				}

				.bubble span {
					display: block;
					font-size: 11px;
					font-weight: 950;
					margin-bottom: 4px;
				}

				.bubble p {
					margin: 0;
					white-space: pre-wrap;
					line-height: 1.45;
					font-size: 14px;
				}

				.quick-replies {
					display: flex;
					flex-wrap: wrap;
					gap: 8px;
					margin-top: 10px;
				}

				.quick-reply {
					min-height: 36px;
					border: 1px solid rgba(11, 143, 106, 0.28);
					border-radius: 999px;
					padding: 0 13px;
					color: var(--zad-blue);
					background: #fff;
					font-size: 13px;
					font-weight: 950;
					cursor: pointer;
				}

				.typing-line {
					width: fit-content;
					border-radius: 999px;
					padding: 7px 10px;
					color: #536173;
					background: #fff;
					border: 1px solid var(--zad-border);
					font-size: 12px;
					font-weight: 900;
				}

				.reply-form {
					display: grid;
					grid-template-columns: 1fr 44px;
					gap: 8px;
					padding: 12px;
					border-top: 1px solid var(--zad-border);
					background: #fff;
				}

				.reply-form input {
					border: 1px solid rgba(36, 84, 125, 0.18);
					border-radius: 8px;
					min-height: 44px;
					padding: 0 12px;
					outline: none;
				}

				.reply-form button {
					border: 0;
					border-radius: 8px;
					color: #fff;
					background: var(--zad-green);
					display: inline-flex;
					align-items: center;
					justify-content: center;
				}

				.error {
					margin: 0;
					padding: 0 14px 14px;
					color: #b42318;
					font-weight: 800;
					font-size: 13px;
				}

				.notice {
					margin: 0;
					padding: 12px 16px;
					color: #05603a;
					background: rgba(55, 212, 156, 0.1);
					border-bottom: 1px solid rgba(11, 143, 106, 0.14);
					font-size: 13px;
					font-weight: 900;
					line-height: 1.45;
				}

				@media (max-width: 640px) {
					.support-root {
						right: 14px;
						bottom: 14px;
					}

					.support-button {
						width: 52px;
						height: 52px;
						min-height: 52px;
						border-radius: 16px;
						padding: 0;
						gap: 0;
						justify-content: center;
						background:
							radial-gradient(circle at 72% 20%, rgba(55, 212, 156, 0.26), transparent 32%),
							linear-gradient(135deg, rgba(255, 255, 255, 0.15), transparent 34%),
							linear-gradient(135deg, #071526 0%, #102033 48%, #0b8f6a 100%);
						box-shadow:
							inset 0 1px rgba(255, 255, 255, 0.18),
							0 14px 30px rgba(8, 9, 13, 0.32),
							0 0 0 1px rgba(143, 234, 255, 0.16);
					}

					.support-button svg {
						width: 27px;
						height: 27px;
					}

					.support-button .support-status-dot {
						position: absolute;
						top: 8px;
						right: 8px;
						width: 9px;
						height: 9px;
					}

					.support-button-label {
						display: none;
					}

					.support-panel {
						position: fixed;
						left: 12px;
						right: 12px;
						bottom: 72px;
						width: auto;
						max-height: calc(100dvh - 96px);
					}

					.start-form,
					.messages {
						padding: 14px;
					}
				}
			`}</style>
		</div>
	);
}
