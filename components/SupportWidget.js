"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Globe2, Headset, Send, X } from "lucide-react";
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

const CHAT_LANGUAGES = [
	{ label: "English", code: "en", rtl: false },
	{ label: "Arabic", code: "ar", rtl: true },
	{ label: "Spanish", code: "es", rtl: false },
	{ label: "French", code: "fr", rtl: false },
	{ label: "Urdu", code: "ur", rtl: true },
	{ label: "Hindi", code: "hi", rtl: false },
	{ label: "Indonesian", code: "id", rtl: false },
	{ label: "Malay (Malaysia)", code: "ms", rtl: false },
];

const LEGACY_LANGUAGE_ALIASES = {
	"Arabic (Fos7a)": "Arabic",
	"Arabic (Egyptian)": "Arabic",
};

const normalizeChatLanguage = (value = "") => {
	const normalized = LEGACY_LANGUAGE_ALIASES[String(value || "").trim()] || String(value || "").trim();
	return CHAT_LANGUAGES.some((language) => language.label === normalized) ? normalized : "";
};

const chatLanguageMeta = (label = "English") =>
	CHAT_LANGUAGES.find((language) => language.label === label) || CHAT_LANGUAGES[0];

const CHAT_COPY = {
	English: {
		customerSupport: "Customer Support",
		hotelSupport: "Hotel support",
		conversationLanguage: "Conversation language",
		name: "Name",
		contact: "Email or phone",
		hotel: "Hotel",
		chooseHotel: "Choose a hotel",
		supportTopic: "Support topic",
		message: "Message",
		messagePlaceholder: "Tell us the room or dates you are looking for.",
		startChat: "Start chat",
		typeMessage: "Type your message",
		endChat: "End chat",
		chatClosed: "This chat has been closed.",
		requiredError: "Please add your name, contact, hotel, and message.",
		hotelError: "Please choose a listed Jannat hotel.",
		startError: "Unable to start chat.",
		messageError: "Message failed.",
		closeError: "Unable to close chat.",
		isTyping: "is typing...",
		topics: {
			reserve_room: "Room pricing / availability",
			reservation: "Existing reservation question",
			payment_inquiry: "Payment or invoice",
			hotel_service: "Hotel services",
			hotel_complaint: "Complaint or urgent help",
			others: "Something else",
		},
	},
	Arabic: {
		customerSupport: "دعم العملاء",
		hotelSupport: "دعم الفنادق",
		conversationLanguage: "لغة المحادثة",
		name: "الاسم",
		contact: "البريد أو الجوال",
		hotel: "الفندق",
		chooseHotel: "اختر الفندق",
		supportTopic: "نوع المساعدة",
		message: "الرسالة",
		messagePlaceholder: "اكتب الغرفة أو التواريخ التي تبحث عنها.",
		startChat: "ابدأ المحادثة",
		typeMessage: "اكتب رسالتك",
		endChat: "إنهاء المحادثة",
		chatClosed: "تم إغلاق هذه المحادثة.",
		requiredError: "يرجى إضافة الاسم وبيانات التواصل والفندق والرسالة.",
		hotelError: "يرجى اختيار فندق من القائمة.",
		startError: "تعذر بدء المحادثة.",
		messageError: "تعذر إرسال الرسالة.",
		closeError: "تعذر إغلاق المحادثة.",
		isTyping: "يكتب الآن...",
		topics: {
			reserve_room: "الغرف والأسعار والتوفر",
			reservation: "استفسار عن حجز قائم",
			payment_inquiry: "الدفع أو الفاتورة",
			hotel_service: "خدمات الفندق",
			hotel_complaint: "شكوى أو مساعدة عاجلة",
			others: "موضوع آخر",
		},
	},
	Spanish: {
		customerSupport: "Atencion al cliente",
		hotelSupport: "Soporte de hotel",
		conversationLanguage: "Idioma de conversacion",
		name: "Nombre",
		contact: "Email o telefono",
		hotel: "Hotel",
		chooseHotel: "Elige un hotel",
		supportTopic: "Tema de ayuda",
		message: "Mensaje",
		messagePlaceholder: "Cuéntanos la habitacion o fechas que buscas.",
		startChat: "Iniciar chat",
		typeMessage: "Escribe tu mensaje",
		endChat: "Terminar chat",
		chatClosed: "Este chat se ha cerrado.",
		requiredError: "Agrega tu nombre, contacto, hotel y mensaje.",
		hotelError: "Elige un hotel de Jannat de la lista.",
		startError: "No se pudo iniciar el chat.",
		messageError: "No se pudo enviar el mensaje.",
		closeError: "No se pudo cerrar el chat.",
		isTyping: "esta escribiendo...",
		topics: {
			reserve_room: "Precios / disponibilidad",
			reservation: "Pregunta sobre reserva",
			payment_inquiry: "Pago o factura",
			hotel_service: "Servicios del hotel",
			hotel_complaint: "Queja o ayuda urgente",
			others: "Otro tema",
		},
	},
	French: {
		customerSupport: "Service client",
		hotelSupport: "Assistance hotel",
		conversationLanguage: "Langue de conversation",
		name: "Nom",
		contact: "Email ou telephone",
		hotel: "Hotel",
		chooseHotel: "Choisir un hotel",
		supportTopic: "Sujet d'aide",
		message: "Message",
		messagePlaceholder: "Indiquez la chambre ou les dates recherchees.",
		startChat: "Demarrer le chat",
		typeMessage: "Ecrivez votre message",
		endChat: "Terminer le chat",
		chatClosed: "Ce chat est ferme.",
		requiredError: "Ajoutez votre nom, contact, hotel et message.",
		hotelError: "Choisissez un hotel Jannat dans la liste.",
		startError: "Impossible de demarrer le chat.",
		messageError: "Echec de l'envoi du message.",
		closeError: "Impossible de fermer le chat.",
		isTyping: "est en train d'ecrire...",
		topics: {
			reserve_room: "Prix / disponibilite",
			reservation: "Question sur reservation",
			payment_inquiry: "Paiement ou facture",
			hotel_service: "Services de l'hotel",
			hotel_complaint: "Plainte ou aide urgente",
			others: "Autre sujet",
		},
	},
	Urdu: {
		customerSupport: "کسٹمر سپورٹ",
		hotelSupport: "ہوٹل سپورٹ",
		conversationLanguage: "گفتگو کی زبان",
		name: "نام",
		contact: "ای میل یا فون",
		hotel: "ہوٹل",
		chooseHotel: "ہوٹل منتخب کریں",
		supportTopic: "مدد کا موضوع",
		message: "پیغام",
		messagePlaceholder: "کمرہ یا تاریخیں لکھیں جن کی آپ تلاش کر رہے ہیں۔",
		startChat: "چیٹ شروع کریں",
		typeMessage: "اپنا پیغام لکھیں",
		endChat: "چیٹ ختم کریں",
		chatClosed: "یہ چیٹ بند ہو چکی ہے۔",
		requiredError: "براہ کرم نام، رابطہ، ہوٹل اور پیغام شامل کریں۔",
		hotelError: "براہ کرم فہرست سے Jannat ہوٹل منتخب کریں۔",
		startError: "چیٹ شروع نہیں ہو سکی۔",
		messageError: "پیغام نہیں بھیجا جا سکا۔",
		closeError: "چیٹ بند نہیں ہو سکی۔",
		isTyping: "لکھ رہے ہیں...",
		topics: {
			reserve_room: "کمرے کی قیمت / دستیابی",
			reservation: "موجودہ ریزرویشن کا سوال",
			payment_inquiry: "ادائیگی یا انوائس",
			hotel_service: "ہوٹل سروسز",
			hotel_complaint: "شکایت یا فوری مدد",
			others: "کوئی اور موضوع",
		},
	},
	Hindi: {
		customerSupport: "ग्राहक सहायता",
		hotelSupport: "होटल सहायता",
		conversationLanguage: "बातचीत की भाषा",
		name: "नाम",
		contact: "ईमेल या फोन",
		hotel: "होटल",
		chooseHotel: "होटल चुनें",
		supportTopic: "सहायता विषय",
		message: "संदेश",
		messagePlaceholder: "आप जिस कमरे या तारीखों की तलाश कर रहे हैं, वह लिखें।",
		startChat: "चैट शुरू करें",
		typeMessage: "अपना संदेश लिखें",
		endChat: "चैट समाप्त करें",
		chatClosed: "यह चैट बंद हो गई है।",
		requiredError: "कृपया नाम, संपर्क, होटल और संदेश जोड़ें।",
		hotelError: "कृपया सूची से Jannat होटल चुनें।",
		startError: "चैट शुरू नहीं हो सकी।",
		messageError: "संदेश नहीं भेजा जा सका।",
		closeError: "चैट बंद नहीं हो सकी।",
		isTyping: "टाइप कर रहे हैं...",
		topics: {
			reserve_room: "कमरे की कीमत / उपलब्धता",
			reservation: "मौजूदा आरक्षण का सवाल",
			payment_inquiry: "भुगतान या इनवॉइस",
			hotel_service: "होटल सेवाएं",
			hotel_complaint: "शिकायत या तत्काल मदद",
			others: "कुछ और",
		},
	},
	Indonesian: {
		customerSupport: "Dukungan pelanggan",
		hotelSupport: "Dukungan hotel",
		conversationLanguage: "Bahasa percakapan",
		name: "Nama",
		contact: "Email atau telepon",
		hotel: "Hotel",
		chooseHotel: "Pilih hotel",
		supportTopic: "Topik bantuan",
		message: "Pesan",
		messagePlaceholder: "Beri tahu kamar atau tanggal yang Anda cari.",
		startChat: "Mulai chat",
		typeMessage: "Ketik pesan Anda",
		endChat: "Akhiri chat",
		chatClosed: "Chat ini telah ditutup.",
		requiredError: "Mohon isi nama, kontak, hotel, dan pesan.",
		hotelError: "Mohon pilih hotel Jannat dari daftar.",
		startError: "Tidak dapat memulai chat.",
		messageError: "Pesan gagal dikirim.",
		closeError: "Tidak dapat menutup chat.",
		isTyping: "sedang mengetik...",
		topics: {
			reserve_room: "Harga / ketersediaan kamar",
			reservation: "Pertanyaan reservasi",
			payment_inquiry: "Pembayaran atau invoice",
			hotel_service: "Layanan hotel",
			hotel_complaint: "Keluhan atau bantuan mendesak",
			others: "Topik lain",
		},
	},
	"Malay (Malaysia)": {
		customerSupport: "Sokongan pelanggan",
		hotelSupport: "Sokongan hotel",
		conversationLanguage: "Bahasa perbualan",
		name: "Nama",
		contact: "E-mel atau telefon",
		hotel: "Hotel",
		chooseHotel: "Pilih hotel",
		supportTopic: "Topik bantuan",
		message: "Mesej",
		messagePlaceholder: "Beritahu kami bilik atau tarikh yang anda cari.",
		startChat: "Mulakan chat",
		typeMessage: "Taip mesej anda",
		endChat: "Tamatkan chat",
		chatClosed: "Chat ini telah ditutup.",
		requiredError: "Sila isi nama, kontak, hotel, dan mesej.",
		hotelError: "Sila pilih hotel Jannat daripada senarai.",
		startError: "Tidak dapat memulakan chat.",
		messageError: "Mesej gagal dihantar.",
		closeError: "Tidak dapat menutup chat.",
		isTyping: "sedang menaip...",
		topics: {
			reserve_room: "Harga / ketersediaan bilik",
			reservation: "Soalan tempahan sedia ada",
			payment_inquiry: "Pembayaran atau invois",
			hotel_service: "Perkhidmatan hotel",
			hotel_complaint: "Aduan atau bantuan segera",
			others: "Topik lain",
		},
	},
};

const getChatCopy = (label = "English") => CHAT_COPY[label] || CHAT_COPY.English;

const DEFAULT_CHAT_HOTEL_NAME = "Zad Al Sad";

const CHAT_DEFAULT_MESSAGE_TEMPLATES = {
	English: (hotel) => `Hello Jannat Booking, I would like to ask about ${hotel}.`,
	Arabic: (hotel) => `مرحبا جنات بوكينج، أرغب بالاستفسار عن ${hotel}.`,
	Spanish: (hotel) => `Hola Jannat Booking, me gustaria consultar sobre ${hotel}.`,
	French: (hotel) => `Bonjour Jannat Booking, je souhaite me renseigner sur ${hotel}.`,
	Urdu: (hotel) => `السلام علیکم Jannat Booking، میں ${hotel} کے بارے میں پوچھنا چاہتا/چاہتی ہوں۔`,
	Hindi: (hotel) => `नमस्ते Jannat Booking, मैं ${hotel} के बारे में पूछना चाहता/चाहती हूँ।`,
	Indonesian: (hotel) => `Halo Jannat Booking, saya ingin bertanya tentang ${hotel}.`,
	"Malay (Malaysia)": (hotel) => `Halo Jannat Booking, saya ingin bertanya tentang ${hotel}.`,
};

const CHAT_DEFAULT_MESSAGE_PREFIXES = Object.values(CHAT_DEFAULT_MESSAGE_TEMPLATES).map((template) =>
	template("__JANNAT_HOTEL__").split("__JANNAT_HOTEL__")[0].trim()
);

const defaultChatMessageFor = (language, hotelName) => {
	const template = CHAT_DEFAULT_MESSAGE_TEMPLATES[language] || CHAT_DEFAULT_MESSAGE_TEMPLATES.English;
	return template(titleCase(hotelName || DEFAULT_CHAT_HOTEL_NAME));
};

const isGeneratedDefaultChatMessage = (value = "") => {
	const text = String(value || "").trim();
	return Boolean(text && CHAT_DEFAULT_MESSAGE_PREFIXES.some((prefix) => text.startsWith(prefix)));
};

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

const renderMessageWithLinks = (text = "") => {
	const safeText = typeof text === "string" ? text : "";
	if (!safeText) return null;
	const linkRegex = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+)/g;
	return safeText.split(linkRegex).map((part, index) => {
		const markdown = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
		if (markdown) {
			return (
				<a key={index} href={markdown[2]} target="_blank" rel="noopener noreferrer">
					{markdown[1]}
				</a>
			);
		}
		return /^https?:\/\//.test(part) ? (
			<a key={index} href={part} target="_blank" rel="noopener noreferrer">
				{part}
			</a>
		) : (
			part
		);
	});
};

export default function SupportWidget({ hotels = [] }) {
	const { isArabic } = useJannatApp();
	const siteDefaultChatLanguage = isArabic ? "Arabic" : "English";
	const [open, setOpen] = useState(false);
	const [caseId, setCaseId] = useState("");
	const [messages, setMessages] = useState([]);
	const [chatLanguage, setChatLanguage] = useState(siteDefaultChatLanguage);
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
	const generatedMessageRef = useRef("");
	const messageManuallyEditedRef = useRef(false);
	const selectedChatLanguage = normalizeChatLanguage(chatLanguage) || siteDefaultChatLanguage;
	const selectedChatLanguageMeta = chatLanguageMeta(selectedChatLanguage);
	const languageName = selectedChatLanguageMeta.label;
	const languageCode = selectedChatLanguageMeta.code;
	const chatCopy = getChatCopy(languageName);
	const isChatArabic = languageName === "Arabic";
	const chatBrandName = isChatArabic ? ARABIC_BRAND_NAME : BRAND_NAME;
	const chatLanguageLabel = chatCopy.conversationLanguage;
	const chatLabel = chatCopy.customerSupport;
	const supportHotel = useMemo(
		() => ({
			_id: JANNAT_SUPPORT_HOTEL_ID,
			hotelName: chatBrandName,
			belongsTo: JANNAT_SUPPORTER_ID,
		}),
		[chatBrandName]
	);
	const hotelOptions = useMemo(() => [supportHotel, ...hotels], [hotels, supportHotel]);
	const selectedHotel = useMemo(
		() => hotelOptions.find((hotel) => String(hotel._id) === String(form.hotelId)),
		[form.hotelId, hotelOptions]
	);
	const topics = useMemo(
		() =>
			supportTopicOptions(isChatArabic).map((topic) => ({
				...topic,
				label: chatCopy.topics?.[topic.value] || topic.label,
			})),
		[chatCopy, isChatArabic]
	);
	const selectedTopic = useMemo(
		() => topics.find((topic) => topic.value === form.topic) || topics[0],
		[form.topic, topics]
	);

	useEffect(() => {
		if (caseId) return;
		const nextDefaultMessage = defaultChatMessageFor(
			languageName,
			form.hotelName || selectedHotel?.hotelName
		);
		setForm((current) => {
			const currentMessage = String(current.message || "").trim();
			const generatedMessage = String(generatedMessageRef.current || "").trim();
			const manuallyEdited = messageManuallyEditedRef.current;
			const shouldRefreshMessage =
				!currentMessage ||
				(!manuallyEdited &&
					((generatedMessage && currentMessage === generatedMessage) ||
						isGeneratedDefaultChatMessage(currentMessage)));
			if (!shouldRefreshMessage) return current;
			generatedMessageRef.current = nextDefaultMessage;
			messageManuallyEditedRef.current = false;
			return {
				...current,
				message: nextDefaultMessage,
			};
		});
	}, [caseId, form.hotelName, languageName, selectedHotel?.hotelName]);

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

	const handleChatLanguageChange = useCallback(
		(value) => {
			const nextLanguage = normalizeChatLanguage(value) || siteDefaultChatLanguage;
			const currentMessage = String(form.message || "").trim();
			const generatedMessage = String(generatedMessageRef.current || "").trim();
			const manuallyEdited = messageManuallyEditedRef.current;
			const shouldRefreshMessage =
				!currentMessage ||
				(!manuallyEdited &&
					((generatedMessage && currentMessage === generatedMessage) ||
						isGeneratedDefaultChatMessage(currentMessage)));
			const nextDefaultMessage = shouldRefreshMessage
				? defaultChatMessageFor(nextLanguage, form.hotelName || selectedHotel?.hotelName)
				: "";
			setChatLanguage(nextLanguage);
			if (shouldRefreshMessage) {
				generatedMessageRef.current = nextDefaultMessage;
				messageManuallyEditedRef.current = false;
				setForm((current) => ({
					...current,
					message: nextDefaultMessage,
				}));
			}
			writeChatQuery(
				{
					language: nextLanguage,
					...(shouldRefreshMessage ? { inquiryDetails: nextDefaultMessage } : {}),
				},
				{ open: true }
			);
			trackConversion(
				"chatLanguageChange",
				{
					source: "support_widget",
					chat_language: nextLanguage,
					chat_language_code: chatLanguageMeta(nextLanguage).code,
				},
				["Chat Language Changed"]
			);
		},
		[form.hotelName, form.message, selectedHotel?.hotelName, siteDefaultChatLanguage, writeChatQuery]
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
			const queryLanguage = normalizeChatLanguage(queryState.language);
			setOpen((current) => (current === queryState.isOpen ? current : queryState.isOpen));
			setChatLanguage((current) => {
				if (queryLanguage) return current === queryLanguage ? current : queryLanguage;
				if (caseId) return current;
				return current === siteDefaultChatLanguage ? current : siteDefaultChatLanguage;
			});
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
	}, [caseId, siteDefaultChatLanguage]);

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
					setNotice(chatCopy.chatClosed);
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
	}, [caseId, open, resetCaseState, chatCopy.chatClosed]);

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
			setTypingStatus(`${data.name || chatBrandName} ${chatCopy.isTyping}`);
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
			setNotice(chatCopy.chatClosed);
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
	}, [caseId, form.name, open, resetCaseState, chatBrandName, chatCopy.chatClosed, chatCopy.isTyping]);

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
			setError(chatCopy.requiredError);
			return;
		}
		const ownerId = String(selectedHotel?.belongsTo?._id || selectedHotel?.belongsTo || "").trim();
		if (!ownerId) {
			setError(chatCopy.hotelError);
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
			if (!res.ok || data?.error) throw new Error(data?.error || chatCopy.startError);
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
			setError(err.message || chatCopy.startError);
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
				setNotice(chatCopy.chatClosed);
				return;
			}
			setError(err.message || chatCopy.messageError);
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
			setNotice(chatCopy.chatClosed);
		} catch (err) {
			setError(err.message || chatCopy.closeError);
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

	const renderChatLanguageSelect = (compact = false) => (
		<div className={compact ? "support-language-row support-language-compact" : "field support-field support-language-field support-language-start"}>
			<div className="support-language-copy">
				<span className="support-language-icon" aria-hidden="true">
					<Globe2 size={16} />
				</span>
				<label>{chatLanguageLabel}</label>
			</div>
			<div className="support-language-select-wrap" dir={selectedChatLanguageMeta.rtl ? "rtl" : "ltr"} style={{ width: "100%" }}>
				<select
					className="support-language-select"
					style={{ width: "100%" }}
					value={languageName}
					onChange={(event) => handleChatLanguageChange(event.target.value)}
					dir={selectedChatLanguageMeta.rtl ? "rtl" : "ltr"}
					aria-label={chatLanguageLabel}
				>
					{CHAT_LANGUAGES.map((language) => (
						<option key={language.label} value={language.label}>
							{language.label}
						</option>
					))}
				</select>
			</div>
		</div>
	);

	return (
		<div className="support-root" dir={selectedChatLanguageMeta.rtl ? "rtl" : "ltr"}>
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
							<strong>{chatBrandName}</strong>
							<span>{chatCopy.hotelSupport}</span>
						</div>
						<div className="support-head-actions">
							{caseId ? (
								<button className="support-end-chat" type="button" onClick={endChat} disabled={busy}>
									{chatCopy.endChat}
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
							{renderChatLanguageSelect(true)}
							<div className="messages" ref={messagesContainerRef} role="log" aria-live="polite">
								{messages.map((message, index) => {
									const sender = brandText(message?.messageBy?.customerName || "Support", isChatArabic);
									const text = brandText(message?.message || "", isChatArabic);
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
											<p dir="auto">{renderMessageWithLinks(text)}</p>
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
															{brandText(quickReply.label, isChatArabic)}
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
									dir={selectedChatLanguageMeta.rtl ? "rtl" : "ltr"}
									onChange={(event) => {
										setReply(event.target.value);
										emitTyping(event.target.value);
									}}
									placeholder={chatCopy.typeMessage}
								/>
								<button type="submit" disabled={busy || !reply.trim()} aria-label="Send message">
									<Send size={18} />
								</button>
							</form>
						</>
					) : (
						<form className="start-form support-form" onSubmit={startChat}>
							{renderChatLanguageSelect(false)}
							<div className="field support-field">
								<label>{chatCopy.name}</label>
								<input
									value={form.name}
									onChange={(event) => updateForm("name", event.target.value)}
									onBlur={(event) => commitChatQueryFields({ name: event.target.value })}
									autoComplete="name"
								/>
							</div>
							<div className="field support-field">
								<label>{chatCopy.contact}</label>
								<input
									dir="ltr"
									value={form.contact}
									onChange={(event) => updateForm("contact", event.target.value)}
									onBlur={(event) => commitChatQueryFields({ contact: event.target.value })}
									autoComplete="email tel"
								/>
							</div>
							<div className="field support-field">
								<label>{chatCopy.hotel}</label>
								<select value={form.hotelId} onChange={(event) => handleHotelChange(event.target.value)}>
									<option value="">{chatCopy.chooseHotel}</option>
									{hotelOptions.map((hotel) => (
										<option key={hotel._id} value={hotel._id}>
											{titleCase(hotel.hotelName)}
										</option>
									))}
								</select>
							</div>
							<div className="field support-field">
								<label>{chatCopy.supportTopic}</label>
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
								<label>{chatCopy.message}</label>
								<textarea
									value={form.message}
									dir={selectedChatLanguageMeta.rtl ? "rtl" : "ltr"}
									onChange={(event) => {
										messageManuallyEditedRef.current = true;
										updateForm("message", event.target.value);
									}}
									onBlur={(event) => commitChatQueryFields({ inquiryDetails: event.target.value })}
									placeholder={chatCopy.messagePlaceholder}
								/>
							</div>
							<button className="btn btn-primary" type="submit" disabled={busy}>
								{chatCopy.startChat}
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

				.support-language-field {
					display: grid;
					grid-template-columns: minmax(0, 1fr) minmax(138px, 168px);
					align-items: center;
					gap: 10px;
					border: 1px solid rgba(11, 143, 106, 0.16);
					border-radius: 8px;
					padding: 12px;
					background:
						radial-gradient(circle at 0% 0%, rgba(55, 212, 156, 0.12), transparent 34%),
						linear-gradient(135deg, rgba(55, 212, 156, 0.09), rgba(36, 78, 125, 0.045)),
						rgba(255, 255, 255, 0.94);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.72),
						0 10px 24px rgba(8, 9, 13, 0.05);
				}

				.support-language-start {
					grid-template-columns: 1fr;
					gap: 10px;
				}

				.support-language-row {
					display: grid;
					grid-template-columns: minmax(0, 1fr) minmax(130px, 168px);
					align-items: center;
					gap: 10px;
					padding: 11px 12px;
					border-bottom: 1px solid rgba(36, 84, 125, 0.12);
					background:
						radial-gradient(circle at 0% 0%, rgba(55, 212, 156, 0.1), transparent 34%),
						linear-gradient(135deg, rgba(55, 212, 156, 0.08), rgba(36, 78, 125, 0.05)),
						#ffffff;
				}

				.support-language-copy {
					min-width: 0;
					display: flex;
					align-items: center;
					gap: 9px;
					width: 100%;
				}

				.support-language-icon {
					width: 34px;
					height: 34px;
					border-radius: 8px;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					flex: 0 0 auto;
					color: var(--zad-green);
					background:
						linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(240, 249, 251, 0.82)),
						rgba(55, 212, 156, 0.08);
					border: 1px solid rgba(11, 143, 106, 0.13);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.9),
						0 8px 18px rgba(15, 20, 35, 0.05);
				}

				.support-field label {
					color: var(--zad-blue);
					font-size: 12px;
					font-weight: 950;
					line-height: 1.2;
				}

				.support-language-copy label,
				.support-language-row label {
					color: var(--zad-blue);
					font-size: 12px;
					font-weight: 950;
					line-height: 1.25;
					white-space: normal;
				}

				.support-field input,
				.support-field select,
				.support-field textarea,
				.support-language-select {
					width: 100%;
					border: 1px solid rgba(36, 84, 125, 0.18);
					border-radius: 8px;
					background: rgba(255, 255, 255, 0.96);
					color: var(--zad-ink);
					outline: none;
				}

				.support-field input,
				.support-field select,
				.support-language-select {
					min-height: 46px;
					padding: 0 13px;
				}

				.support-language-select-wrap {
					position: relative;
					min-width: 0;
					width: 100%;
				}

				.support-language-select {
					display: block;
					min-height: 44px;
					padding-inline: 13px;
					font-size: 13px;
					font-weight: 950;
					line-height: 1;
					cursor: pointer;
					background:
						linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 248, 252, 0.92)),
						#ffffff;
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.95),
						0 8px 18px rgba(15, 20, 35, 0.05);
					transition:
						border-color 160ms ease,
						box-shadow 160ms ease,
						background 160ms ease;
				}

				.support-language-select:focus {
					border-color: rgba(11, 143, 106, 0.55);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.95),
						0 0 0 3px rgba(11, 143, 106, 0.12),
						0 10px 22px rgba(15, 20, 35, 0.08);
				}

				:global(.support-language-start) {
					display: grid !important;
					grid-template-columns: 1fr !important;
					gap: 10px !important;
				}

				:global(.support-language-compact) {
					display: grid !important;
					grid-template-columns: minmax(0, 1fr) minmax(130px, 168px) !important;
					align-items: center !important;
					gap: 10px !important;
				}

				:global(.support-language-copy) {
					min-width: 0 !important;
					width: 100% !important;
					display: flex !important;
					align-items: center !important;
					gap: 9px !important;
				}

				:global(.support-language-icon) {
					width: 34px !important;
					height: 34px !important;
					border-radius: 8px !important;
					display: inline-flex !important;
					align-items: center !important;
					justify-content: center !important;
					flex: 0 0 auto !important;
					color: var(--zad-green) !important;
					background:
						linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(240, 249, 251, 0.82)),
						rgba(55, 212, 156, 0.08) !important;
					border: 1px solid rgba(11, 143, 106, 0.13) !important;
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.9),
						0 8px 18px rgba(15, 20, 35, 0.05) !important;
				}

				:global(.support-language-copy label) {
					color: var(--zad-blue) !important;
					font-size: 12px !important;
					font-weight: 950 !important;
					line-height: 1.25 !important;
					white-space: normal !important;
				}

				:global(.support-language-select-wrap) {
					position: relative !important;
					width: 100% !important;
					min-width: 0 !important;
				}

				:global(.support-language-select) {
					display: block !important;
					width: 100% !important;
					min-height: 46px !important;
					border: 1px solid rgba(36, 84, 125, 0.18) !important;
					border-radius: 8px !important;
					padding-inline: 13px !important;
					color: var(--zad-ink) !important;
					background:
						linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 248, 252, 0.92)),
						#ffffff !important;
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.95),
						0 8px 18px rgba(15, 20, 35, 0.05) !important;
					font-size: 14px !important;
					font-weight: 900 !important;
					line-height: 1 !important;
					cursor: pointer !important;
					outline: none !important;
				}

				:global(.support-language-select:focus) {
					border-color: rgba(11, 143, 106, 0.55) !important;
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.95),
						0 0 0 3px rgba(11, 143, 106, 0.12),
						0 10px 22px rgba(15, 20, 35, 0.08) !important;
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

				.bubble p a {
					color: var(--zad-green);
					font-weight: 950;
					text-decoration: underline;
					text-underline-offset: 2px;
					overflow-wrap: anywhere;
				}

				.bubble p a:hover,
				.bubble p a:focus-visible {
					color: #087e60;
				}

				.bubble.guest p a {
					color: #ffffff;
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

					.support-language-row {
						grid-template-columns: 1fr;
						gap: 6px;
						padding: 10px 14px;
					}

					.support-language-field {
						grid-template-columns: 1fr;
						gap: 9px;
						padding: 11px;
					}

					.support-language-icon {
						width: 32px;
						height: 32px;
					}
				}
			`}</style>
		</div>
	);
}
