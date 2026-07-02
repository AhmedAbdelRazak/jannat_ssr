"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Globe2, Headset, HeartHandshake, Send, Smile, Star, X } from "lucide-react";
import { apiUrl, closePublicSupportCase, socketBaseUrl } from "../lib/api";
import { trackConversion } from "../lib/analyticsEvents";
import {
	CHAT_OPEN_PARAM,
	mergeChatQueryParams,
	readChatQueryParams,
	replaceSearchWithoutReload,
} from "../lib/chatQueryParams";
import { ARABIC_BRAND_NAME, BRAND_NAME, CONTACT_EMAIL } from "../lib/constants";
import { slugifyHotel, titleCase } from "../lib/format";
import { useJannatApp } from "./JannatAppProvider";

const JANNAT_SUPPORT_HOTEL_ID = "674cf8997e3780f1f838d458";
const JANNAT_SUPPORTER_ID = "6553f1c6d06c5cea2f98a838";
const SUPPORT_CHAT_STORAGE_KEY = "jannat_support_chat_state_v1";
const SUPPORT_CHAT_STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SUPPORT_SEND_TIMEOUT_MS = 20000;
const SUPPORT_SEND_VERIFY_TIMEOUT_MS = 7000;
const LOCAL_AI_TYPING_DELAY_MS = 2000;
const LOCAL_AI_TYPING_VISIBLE_MS = 8000;
const LOCAL_GUEST_TYPING_IDLE_MS = 2000;

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
		messagePlaceholder: "Tell us how we can help today.",
		startChat: "Start chat",
		typeMessage: "Type your message",
		endChat: "End chat",
		rateConversation: "How was this conversation?",
		ratingCaption: "Your feedback helps us keep support fast, clear, and helpful.",
		submitRating: "Submit rating",
		skipRating: "Skip",
		ratingThanks: "Thank you for your feedback. This chat has been closed.",
		emojiPicker: "Add emoji",
		chatClosed: "This chat has been closed.",
		chatRestarted: "The previous chat was closed, so I started a fresh chat and sent your message.",
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
		messagePlaceholder: "اكتب كيف يمكننا مساعدتك اليوم.",
		startChat: "ابدأ المحادثة",
		typeMessage: "اكتب رسالتك",
		endChat: "إنهاء المحادثة",
		rateConversation: "كيف كانت هذه المحادثة؟",
		ratingCaption: "يساعدنا تقييمك في الحفاظ على دعم سريع وواضح ومفيد.",
		submitRating: "إرسال التقييم",
		skipRating: "تخطي",
		ratingThanks: "شكرا لتقييمك. تم إغلاق المحادثة.",
		emojiPicker: "إضافة رمز تعبيري",
		chatClosed: "تم إغلاق هذه المحادثة.",
		chatRestarted: "تم إغلاق المحادثة السابقة، فبدأت محادثة جديدة وأرسلت رسالتك.",
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
		messagePlaceholder: "Cuentanos como podemos ayudarte hoy.",
		startChat: "Iniciar chat",
		typeMessage: "Escribe tu mensaje",
		endChat: "Terminar chat",
		rateConversation: "Como fue esta conversacion?",
		ratingCaption: "Tu opinion nos ayuda a mantener el soporte rapido, claro y util.",
		submitRating: "Enviar calificacion",
		skipRating: "Omitir",
		ratingThanks: "Gracias por tu comentario. Este chat se ha cerrado.",
		emojiPicker: "Agregar emoji",
		chatClosed: "Este chat se ha cerrado.",
		chatRestarted: "El chat anterior se cerro, asi que inicie uno nuevo y envie tu mensaje.",
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
		messagePlaceholder: "Dites-nous comment nous pouvons vous aider aujourd'hui.",
		startChat: "Demarrer le chat",
		typeMessage: "Ecrivez votre message",
		endChat: "Terminer le chat",
		rateConversation: "Comment s'est passee cette conversation ?",
		ratingCaption: "Votre avis nous aide a garder une assistance rapide, claire et utile.",
		submitRating: "Envoyer la note",
		skipRating: "Ignorer",
		ratingThanks: "Merci pour votre avis. Ce chat est ferme.",
		emojiPicker: "Ajouter un emoji",
		chatClosed: "Ce chat est ferme.",
		chatRestarted: "La conversation precedente etait fermee; j'en ai ouvert une nouvelle et envoye votre message.",
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
		messagePlaceholder: "بتائیں آج ہم آپ کی کیسے مدد کر سکتے ہیں۔",
		startChat: "چیٹ شروع کریں",
		typeMessage: "اپنا پیغام لکھیں",
		endChat: "چیٹ ختم کریں",
		rateConversation: "\u06cc\u06c1 \u06af\u0641\u062a\u06af\u0648 \u06a9\u06cc\u0633\u06cc \u0631\u06c1\u06cc\u061f",
		ratingCaption: "آپ کی رائے ہمیں سپورٹ تیز، واضح اور مددگار رکھنے میں مدد دیتی ہے۔",
		submitRating: "\u0631\u06cc\u0679\u0646\u06af \u0628\u06be\u06cc\u062c\u06cc\u06ba",
		skipRating: "\u0686\u06be\u0648\u0691 \u062f\u06cc\u06ba",
		ratingThanks: "\u0622\u067e \u06a9\u06cc \u0631\u0627\u0626\u06d2 \u06a9\u0627 \u0634\u06a9\u0631\u06cc\u06c1\u06d4 \u06cc\u06c1 \u0686\u06cc\u0679 \u0628\u0646\u062f \u06a9\u0631 \u062f\u06cc \u06af\u0626\u06cc \u06c1\u06d2\u06d4",
		emojiPicker: "\u0627\u06cc\u0645\u0648\u062c\u06cc \u0634\u0627\u0645\u0644 \u06a9\u0631\u06cc\u06ba",
		chatClosed: "یہ چیٹ بند ہو چکی ہے۔",
		chatRestarted: "پچھلی چیٹ بند ہو چکی تھی، اس لیے نئی چیٹ شروع کر کے آپ کا پیغام بھیج دیا گیا۔",
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
		messagePlaceholder: "बताएं, आज हम आपकी कैसे मदद कर सकते हैं।",
		startChat: "चैट शुरू करें",
		typeMessage: "अपना संदेश लिखें",
		endChat: "चैट समाप्त करें",
		rateConversation: "\u092f\u0939 \u092c\u093e\u0924\u091a\u0940\u0924 \u0915\u0948\u0938\u0940 \u0930\u0939\u0940?",
		ratingCaption: "आपकी प्रतिक्रिया हमें सहायता को तेज, स्पष्ट और उपयोगी बनाए रखने में मदद करती है।",
		submitRating: "\u0930\u0947\u091f\u093f\u0902\u0917 \u092d\u0947\u091c\u0947\u0902",
		skipRating: "\u091b\u094b\u0921\u093c\u0947\u0902",
		ratingThanks: "\u0906\u092a\u0915\u0940 \u092a\u094d\u0930\u0924\u093f\u0915\u094d\u0930\u093f\u092f\u093e \u0915\u0947 \u0932\u093f\u090f \u0927\u0928\u094d\u092f\u0935\u093e\u0926\u0964 \u092f\u0939 \u091a\u0948\u091f \u092c\u0902\u0926 \u0915\u0930 \u0926\u0940 \u0917\u0908 \u0939\u0948\u0964",
		emojiPicker: "\u0907\u092e\u094b\u091c\u0940 \u091c\u094b\u0921\u093c\u0947\u0902",
		chatClosed: "यह चैट बंद हो गई है।",
		chatRestarted: "पिछली चैट बंद हो गई थी, इसलिए नई चैट शुरू करके आपका संदेश भेज दिया गया।",
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
		messagePlaceholder: "Beri tahu bagaimana kami dapat membantu hari ini.",
		startChat: "Mulai chat",
		typeMessage: "Ketik pesan Anda",
		endChat: "Akhiri chat",
		rateConversation: "Bagaimana percakapan ini?",
		ratingCaption: "Masukan Anda membantu kami menjaga dukungan tetap cepat, jelas, dan bermanfaat.",
		submitRating: "Kirim rating",
		skipRating: "Lewati",
		ratingThanks: "Terima kasih atas masukan Anda. Chat ini telah ditutup.",
		emojiPicker: "Tambah emoji",
		chatClosed: "Chat ini telah ditutup.",
		chatRestarted: "Chat sebelumnya sudah ditutup, jadi saya memulai chat baru dan mengirim pesan Anda.",
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
		messagePlaceholder: "Beritahu kami bagaimana kami boleh membantu hari ini.",
		startChat: "Mulakan chat",
		typeMessage: "Taip mesej anda",
		endChat: "Tamatkan chat",
		rateConversation: "Bagaimana perbualan ini?",
		ratingCaption: "Maklum balas anda membantu kami memastikan sokongan cepat, jelas, dan berguna.",
		submitRating: "Hantar rating",
		skipRating: "Langkau",
		ratingThanks: "Terima kasih atas maklum balas anda. Chat ini telah ditutup.",
		emojiPicker: "Tambah emoji",
		chatClosed: "Chat ini telah ditutup.",
		chatRestarted: "Chat sebelumnya telah ditutup, jadi saya mulakan chat baharu dan menghantar mesej anda.",
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

const readResponseJson = async (response) => {
	try {
		return await response.json();
	} catch {
		return {};
	}
};

const wait = (ms = 0) => new Promise((resolve) => window.setTimeout(resolve, ms));

const supportRequestError = (message, status, code) => {
	const error = new Error(message);
	error.status = status;
	error.code = code;
	return error;
};

const isClosedSupportCaseError = (error = {}) =>
	error?.code === "SUPPORT_CASE_CLOSED" ||
	error?.status === 409 ||
	/closed/i.test(String(error?.message || ""));

const isAbortError = (error = {}) =>
	error?.name === "AbortError" || /aborted/i.test(String(error?.message || ""));

const readStoredSupportChatState = () => {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(SUPPORT_CHAT_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return null;
		const updatedAt = Number(parsed.updatedAt || 0);
		if (updatedAt && Date.now() - updatedAt > SUPPORT_CHAT_STORAGE_TTL_MS) {
			window.localStorage.removeItem(SUPPORT_CHAT_STORAGE_KEY);
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
};

const writeStoredSupportChatState = (state = {}) => {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			SUPPORT_CHAT_STORAGE_KEY,
			JSON.stringify({
				...state,
				updatedAt: Date.now(),
			})
		);
	} catch {
		// Storage may be blocked in private browsing; URL state still works.
	}
};

const clearStoredSupportChatState = () => {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(SUPPORT_CHAT_STORAGE_KEY);
	} catch {
		// Nothing else to do if storage is unavailable.
	}
};

const supportClientTag = () =>
	`client:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

const normalizeHotelSlug = (value = "") => {
	try {
		return decodeURIComponent(String(value || ""));
	} catch {
		return String(value || "");
	}
};

const singleHotelSlugFromPathname = (pathname = "") => {
	const match = String(pathname || "").match(/\/single-hotel\/([^/?#]+)/i);
	return match ? normalizeHotelSlug(match[1]).toLowerCase() : "";
};

const isHomePathname = (pathname = "") => {
	const normalized = String(pathname || "/").replace(/\/+$/, "") || "/";
	return normalized === "/";
};

const hotelSlugKey = (hotel = {}) =>
	normalizeHotelSlug(slugifyHotel(hotel?.hotelName || "")).toLowerCase();

const supportHotelDisplayName = (hotel = {}, isArabic = false) =>
	String(
		isArabic && hotel?.hotelName_OtherLanguage
			? hotel.hotelName_OtherLanguage
			: titleCase(hotel?.hotelName || "")
	).trim();

const DEFAULT_CHAT_HOTEL_NAME = "Zad Al Sad";

const CHAT_DEFAULT_MESSAGE_TEMPLATES = {
	English: (hotel) => `Assalamu alaikum Jannat Booking, I would like to ask about ${hotel}.`,
	Arabic: (hotel) => `\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645 \u062c\u0646\u0627\u062a \u0628\u0648\u0643\u064a\u0646\u062c\u060c \u0623\u0631\u063a\u0628 \u0628\u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u0639\u0646 ${hotel}.`,
	Spanish: (hotel) => `Assalamu alaikum Jannat Booking, me gustaria consultar sobre ${hotel}.`,
	French: (hotel) => `Assalamu alaikum Jannat Booking, je souhaite me renseigner sur ${hotel}.`,
	Urdu: (hotel) => `السلام علیکم Jannat Booking، میں ${hotel} کے بارے میں پوچھنا چاہتا/چاہتی ہوں۔`,
	Hindi: (hotel) => `\u0905\u0938\u094d\u0938\u0932\u093e\u092e\u0941 \u0905\u0932\u0948\u0915\u0941\u092e Jannat Booking, \u092e\u0948\u0902 ${hotel} \u0915\u0947 \u092c\u093e\u0930\u0947 \u092e\u0947\u0902 \u092a\u0942\u091b\u0928\u093e \u091a\u093e\u0939\u0924\u093e/\u091a\u093e\u0939\u0924\u0940 \u0939\u0942\u0901\u0964`,
	Indonesian: (hotel) => `Assalamualaikum Jannat Booking, saya ingin bertanya tentang ${hotel}.`,
	"Malay (Malaysia)": (hotel) => `Assalamualaikum Jannat Booking, saya ingin bertanya tentang ${hotel}.`,
};

const CHAT_DEFAULT_MESSAGE_PREFIXES = Object.values(CHAT_DEFAULT_MESSAGE_TEMPLATES).map((template) =>
	template("__JANNAT_HOTEL__").split("__JANNAT_HOTEL__")[0].trim()
);

const defaultChatMessageFor = (language, hotelName) => {
	const template = CHAT_DEFAULT_MESSAGE_TEMPLATES[language] || CHAT_DEFAULT_MESSAGE_TEMPLATES.English;
	return template(titleCase(hotelName || DEFAULT_CHAT_HOTEL_NAME));
};

const receptionChatMessageFor = (language, hotelName) => {
	const hotel = titleCase(hotelName || DEFAULT_CHAT_HOTEL_NAME);
	const templates = {
		English: `Assalamu alaikum, I would like to chat with reception about ${hotel}.`,
		Arabic: `\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645\u060c \u0623\u0631\u063a\u0628 \u0628\u0627\u0644\u062a\u062d\u062f\u062b \u0645\u0639 \u0627\u0644\u0627\u0633\u062a\u0642\u0628\u0627\u0644 \u0628\u062e\u0635\u0648\u0635 ${hotel}.`,
		Spanish: `Assalamu alaikum, me gustaria hablar con recepcion sobre ${hotel}.`,
		French: `Assalamu alaikum, je souhaite parler avec la reception au sujet de ${hotel}.`,
		Urdu: `السلام علیکم، میں ${hotel} کے بارے میں ریسپشن سے بات کرنا چاہتا/چاہتی ہوں۔`,
		Hindi: `\u0905\u0938\u094d\u0938\u0932\u093e\u092e\u0941 \u0905\u0932\u0948\u0915\u0941\u092e, \u092e\u0948\u0902 ${hotel} \u0915\u0947 \u092c\u093e\u0930\u0947 \u092e\u0947\u0902 \u0930\u093f\u0938\u0947\u092a\u094d\u0936\u0928 \u0938\u0947 \u092c\u093e\u0924 \u0915\u0930\u0928\u093e \u091a\u093e\u0939\u0924\u093e/\u091a\u093e\u0939\u0924\u0940 \u0939\u0942\u0901\u0964`,
		Indonesian: `Assalamualaikum, saya ingin berbicara dengan resepsionis tentang ${hotel}.`,
		"Malay (Malaysia)": `Assalamualaikum, saya ingin bercakap dengan resepsi tentang ${hotel}.`,
	};
	return templates[language] || templates.English;
};

const CHAT_RECEPTION_MESSAGE_PREFIXES = [
	"Assalamu alaikum, I would like to chat with reception about",
	"\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645\u060c \u0623\u0631\u063a\u0628 \u0628\u0627\u0644\u062a\u062d\u062f\u062b \u0645\u0639 \u0627\u0644\u0627\u0633\u062a\u0642\u0628\u0627\u0644 \u0628\u062e\u0635\u0648\u0635",
	"Assalamu alaikum, me gustaria hablar con recepcion sobre",
	"Assalamu alaikum, je souhaite parler avec la reception au sujet de",
	"السلام علیکم، میں",
	"\u0905\u0938\u094d\u0938\u0932\u093e\u092e\u0941 \u0905\u0932\u0948\u0915\u0941\u092e, \u092e\u0948\u0902",
	"Assalamualaikum, saya ingin berbicara dengan resepsionis tentang",
	"Assalamualaikum, saya ingin bercakap dengan resepsi tentang",
];

const isGeneratedDefaultChatMessage = (value = "") => {
	const text = String(value || "").trim();
	return Boolean(
		text &&
			[...CHAT_DEFAULT_MESSAGE_PREFIXES, ...CHAT_RECEPTION_MESSAGE_PREFIXES].some(
				(prefix) => text.startsWith(prefix)
			)
	);
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

const normalizedIdentity = (value = "") =>
	String(value || "")
		.trim()
		.toLowerCase();

const SUPPORT_MESSAGE_EMAILS = new Set([
	"support@jannatbooking.com",
	"management@xhotelpro.com",
]);

const SUPPORT_MESSAGE_USER_IDS = new Set([
	"jannat-ai-support",
	"jannat-system",
	"system",
]);

const messageSenderRole = (message = {}, contact = "") => {
	const email = normalizedIdentity(message?.messageBy?.customerEmail);
	const userId = normalizedIdentity(message?.messageBy?.userId);
	const contactValue = normalizedIdentity(contact);
	if (
		message?.isAi ||
		message?.isSystem ||
		SUPPORT_MESSAGE_EMAILS.has(email) ||
		SUPPORT_MESSAGE_USER_IDS.has(userId)
	) {
		return "agent";
	}
	if (message?.clientTag || (contactValue && email === contactValue)) return "guest";
	return userId || email ? "agent" : "guest";
};

const normalizedClientTag = (message = {}) =>
	String(message?.clientTag || "").trim();

const messageKey = (message = {}) =>
	normalizedClientTag(message) ||
	message?._id ||
	`${message?.date || ""}:${message?.messageBy?.customerEmail || ""}:${message?.message || ""}`;

const normalizedMessageText = (value = "") =>
	String(value || "")
		.trim()
		.replace(/\s+/g, " ");

const messageTimestamp = (message = {}) => {
	const time = new Date(message?.date || 0).getTime();
	return Number.isFinite(time) ? time : 0;
};

const messageFingerprint = (message = {}) =>
	[
		messageSenderRole(message),
		String(message?.messageBy?.customerEmail || "").trim().toLowerCase(),
		String(message?.messageBy?.userId || "").trim().toLowerCase(),
		normalizedMessageText(message?.message),
	].join("|");

const looseMessageFingerprint = (message = {}) =>
	[messageSenderRole(message), normalizedMessageText(message?.message)].join("|");

const sameVisibleMessage = (left = {}, right = {}) => {
	const leftClientTag = normalizedClientTag(left);
	const rightClientTag = normalizedClientTag(right);
	if (leftClientTag && rightClientTag) return leftClientTag === rightClientTag;
	const leftKey = messageKey(left);
	const rightKey = messageKey(right);
	if (leftKey && rightKey && leftKey === rightKey) return true;
	const leftTime = messageTimestamp(left);
	const rightTime = messageTimestamp(right);
	const hasOptimisticTag = Boolean(leftClientTag || rightClientTag);
	const closeInTime =
		!leftTime ||
		!rightTime ||
		Math.abs(leftTime - rightTime) <= (hasOptimisticTag ? 90000 : 15000);
	if (messageFingerprint(left) === messageFingerprint(right)) return closeInTime;
	if (looseMessageFingerprint(left) !== looseMessageFingerprint(right)) return false;
	if (!closeInTime) return false;
	const leftHasServerId = Boolean(left?._id);
	const rightHasServerId = Boolean(right?._id);
	return (
		hasOptimisticTag ||
		leftHasServerId !== rightHasServerId
	);
};

const mergeDuplicateMessage = (current = {}, incoming = {}) => {
	const incomingReplies = quickRepliesForMessage(incoming);
	return {
		...current,
		...incoming,
		_id: incoming?._id || current?._id,
		clientTag: incoming?.clientTag || current?.clientTag,
		quickReplies: incomingReplies.length ? incoming.quickReplies : current.quickReplies,
	};
};

const mergeConversationMessages = (current = [], incoming = []) => {
	const next = Array.isArray(current) ? [...current] : [];
	const rows = Array.isArray(incoming) ? incoming : [incoming];
	rows.filter(Boolean).forEach((message) => {
		const existingIndex = next.findIndex((row) => sameVisibleMessage(row, message));
		if (existingIndex >= 0) {
			next[existingIndex] = mergeDuplicateMessage(next[existingIndex], message);
			return;
		}
		next.push(message);
	});
	return next;
};

const COMMON_CHAT_EMOJIS = [
	"\uD83D\uDE0A",
	"\uD83D\uDE4F",
	"\uD83C\uDF38",
	"\u2705",
	"\uD83D\uDC4D",
	"\u2764\uFE0F",
	"\uD83C\uDF19",
	"\uD83D\uDCAB",
];

const isMobileComposerViewport = () => {
	if (typeof window === "undefined") return false;
	return (
		window.innerWidth <= 768 ||
		window.matchMedia?.("(pointer: coarse)")?.matches === true
	);
};

const readableLinkLabel = (url = "", explicitLabel = "") => {
	const safeUrl = String(url || "");
	const label = String(explicitLabel || "").trim();
	try {
		const parsed = new URL(safeUrl);
		const path = parsed.pathname.toLowerCase();
		const hostname = parsed.hostname.toLowerCase();
		if (path.includes("/single-reservation/") || path.includes("/single-reservations/")) {
			return "Reservation Confirmation";
		}
		if (path.includes("/client-payment/")) return "Payment Link";
		if (path.includes("/single-hotel/")) return "Hotel Details";
		if (path.includes("/invoice")) return "Invoice";
		if (
			hostname === "maps.app.goo.gl" ||
			hostname === "maps.google.com" ||
			(hostname.endsWith(".google.com") && path.startsWith("/maps")) ||
			(hostname === "google.com" && path.startsWith("/maps"))
		) {
			if (label && !/^https?:\/\//i.test(label)) return label;
			return path.startsWith("/maps/dir") ? "Google Maps Directions" : "Google Maps Location";
		}
		return label && !/^https?:\/\//i.test(label) ? label : hostname.replace(/^www\./, "");
	} catch {
		return label || "Open Link";
	}
};

const RTL_SCRIPT_RE = /[\u0591-\u07ff\ufb1d-\ufdfd\ufe70-\ufefc]/u;
const STRONG_SCRIPT_RE = /[\u0591-\u07ff\ufb1d-\ufdfd\ufe70-\ufefcA-Za-z]/gu;
const LTR_TEXT_RE = /[A-Za-z]/u;
const LTR_SEGMENT_RE =
	/(\([^()\u0591-\u07ff\ufb1d-\ufdfd\ufe70-\ufefc]*[A-Za-z][^()\u0591-\u07ff\ufb1d-\ufdfd\ufe70-\ufefc]*\)|[A-Za-z][A-Za-z0-9&.,'\u2019/+\-\u2013\u2014() ]*[A-Za-z0-9)]?)/gu;

const messageTextDirection = (value = "") => {
	const text = String(value || "");
	const strongChars = text.match(STRONG_SCRIPT_RE) || [];
	if (!strongChars.length) return "auto";
	return RTL_SCRIPT_RE.test(strongChars[0]) ? "rtl" : "ltr";
};

const renderDirectionalText = (text = "", keyPrefix = "text") =>
	String(text || "")
		.split(LTR_SEGMENT_RE)
		.filter((part) => part !== "")
		.map((part, index) => {
			const dir = LTR_TEXT_RE.test(part) ? "ltr" : "auto";
			return (
				<bdi
					key={`${keyPrefix}-dir-${index}`}
					dir={dir}
					className={dir === "ltr" ? "message-ltr" : "message-auto"}
				>
					{part}
				</bdi>
			);
		});

const renderFormattedText = (text = "", keyPrefix = "text") =>
	String(text || "")
		.split(/(\*\*[^*]+\*\*)/g)
		.map((part, index) => {
			const bold = part.match(/^\*\*([^*]+)\*\*$/);
			return bold ? (
				<strong key={`${keyPrefix}-bold-${index}`} dir={messageTextDirection(bold[1])}>
					{renderDirectionalText(bold[1], `${keyPrefix}-bold-${index}`)}
				</strong>
			) : (
				renderDirectionalText(part, `${keyPrefix}-part-${index}`)
			);
		});

const renderMessageWithLinks = (text = "", keyPrefix = "link") => {
	const safeText = typeof text === "string" ? text : "";
	if (!safeText) return null;
	const linkRegex = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+)/g;
	return safeText.split(linkRegex).map((part, index) => {
		const markdown = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
		if (markdown) {
			const label = readableLinkLabel(markdown[2], markdown[1]);
			return (
				<a
					key={`${keyPrefix}-markdown-${index}`}
					href={markdown[2]}
					target="_blank"
					rel="noopener noreferrer"
					dir={messageTextDirection(label)}
				>
					{renderDirectionalText(label, `${keyPrefix}-markdown-${index}`)}
				</a>
			);
		}
		if (/^https?:\/\//.test(part)) {
			const match = part.match(/^(https?:\/\/[^\s<>()]+?)([.,!?;:]*)$/);
			const href = match?.[1] || part;
			const suffix = match?.[2] || "";
			const label = readableLinkLabel(href);
			return [
				<a
					key={`${keyPrefix}-url-${index}`}
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					dir={messageTextDirection(label)}
				>
					{renderDirectionalText(label, `${keyPrefix}-url-${index}`)}
				</a>,
				suffix ? <span key={`${keyPrefix}-suffix-${index}`}>{suffix}</span> : null,
			];
		}
		return renderFormattedText(part, `${keyPrefix}-part-${index}`);
	});
};

const renderMessageLine = (line = "", index = 0) => {
	const text = String(line || "");
	if (!text.trim()) {
		return <span key={`line-break-${index}`} className="message-break" aria-hidden="true" />;
	}
	const bulletMatch = text.match(/^(\s*(?:[-*•]|\d+[.)]|[٠-٩]+[.)])\s+)(.+)$/u);
	const bullet = bulletMatch?.[1] || "";
	const body = bulletMatch?.[2] || text;
	const labelMatch = body.match(/^([^:：]{1,42})\s*[:：]\s*(.+)$/u);
	const label = String(labelMatch?.[1] || "").trim();
	const value = String(labelMatch?.[2] || "");
	const trimmedBody = body.trim();
	const canStyleLabel =
		label &&
		value.trim() &&
		/[\p{L}]/u.test(label) &&
		!/https?:\/\//i.test(label) &&
		!/^https?:\/\//i.test(trimmedBody) &&
		!/^\[[^\]]+\]\(https?:\/\//i.test(trimmedBody);

	return (
		<span key={`line-${index}`} className="message-line">
			{bullet ? <span className="message-bullet">{bullet}</span> : null}
			{canStyleLabel ? (
				<>
					<strong className="message-label">{label}:</strong>{" "}
					{renderMessageWithLinks(value, `line-${index}-value`)}
				</>
			) : (
				renderMessageWithLinks(body, `line-${index}`)
			)}
		</span>
	);
};

const renderMessageLinePolished = (line = "", index = 0) => {
	const text = String(line || "");
	if (!text.trim()) {
		return <span key={`line-break-${index}`} className="message-break" aria-hidden="true" />;
	}
	const bulletMatch = text.match(
		/^(\s*(?:[-*\u2022\u2023\u25E6\u2043\u2219]|\d+[.)]|[\u0660-\u0669]+[.)]|[\u2705\u2611\u2713\u2714\u25AA\u25AB\u25CF\u25CB\u25A0\u25A1\u25B8\u25B6\u279C\u27A1]\uFE0F?|[\u{1F7E2}-\u{1F7EB}]|[\u{1F539}-\u{1F53C}]|\u{1F449})\s+)(.+)$/u
	);
	const bullet = bulletMatch?.[1] || "";
	const body = bulletMatch?.[2] || text;
	const lineDirection = messageTextDirection(body);
	const labelMatch = body.match(/^([^:\uFF1A]{1,42})\s*[:\uFF1A]\s*(.+)$/u);
	const label = String(labelMatch?.[1] || "").trim();
	const value = String(labelMatch?.[2] || "");
	const trimmedBody = body.trim();
	const canStyleLabel =
		label &&
		value.trim() &&
		/[\p{L}]/u.test(label) &&
		!/https?:\/\//i.test(label) &&
		!/^https?:\/\//i.test(trimmedBody) &&
		!/^\[[^\]]+\]\(https?:\/\//i.test(trimmedBody);

	return (
		<span
			key={`line-${index}`}
			className={`message-line${bullet ? " has-bullet" : ""}`}
			dir={lineDirection}
		>
			{bullet ? (
				<span className="message-bullet" dir="auto">
					{bullet.trim()}
				</span>
			) : null}
			<span className="message-body" dir={lineDirection}>
				{canStyleLabel ? (
					<>
						<strong className="message-label" dir={messageTextDirection(label)}>
							{renderDirectionalText(`${label}:`, `line-${index}-label`)}
						</strong>{" "}
						{renderMessageWithLinks(value, `line-${index}-value`)}
					</>
				) : (
					renderMessageWithLinks(body, `line-${index}`)
				)}
			</span>
		</span>
	);
};

const renderMessageContent = (text = "") =>
	String(text || "")
		.split(/\r?\n/)
		.map((line, index) => renderMessageLinePolished(line, index));

const typingStatusText = ({ name, isAi, languageName, fallback }) => {
	const typingName = String(name || "").trim();
	const suffix =
		languageName === "Arabic" && isAi
			? "\u062a\u0643\u062a\u0628 \u0627\u0644\u0622\u0646..."
			: fallback;
	return [typingName, suffix].filter(Boolean).join(" ");
};

export default function SupportWidget({ hotels = [] }) {
	const { isArabic } = useJannatApp();
	const pathname = usePathname() || "";
	const siteDefaultChatLanguage = isArabic ? "Arabic" : "English";
	const [open, setOpen] = useState(false);
	const [caseId, setCaseId] = useState("");
	const [caseMeta, setCaseMeta] = useState(null);
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
	const [sendingReplyCount, setSendingReplyCount] = useState(0);
	const [closingChat, setClosingChat] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [typingStatus, setTypingStatus] = useState("");
	const [typingStatusIsAi, setTypingStatusIsAi] = useState(false);
	const [emojiOpen, setEmojiOpen] = useState(false);
	const [isGuestTypingLocal, setIsGuestTypingLocal] = useState(false);
	const [ratingVisible, setRatingVisible] = useState(false);
	const [rating, setRating] = useState(5);
	const [conversationEnded, setConversationEnded] = useState(false);
	const [mobileComposer, setMobileComposer] = useState(false);
	const socketRef = useRef(null);
	const typingStatusTimerRef = useRef(null);
	const localAiTypingDelayTimerRef = useRef(null);
	const guestTypingTimerRef = useRef(null);
	const chatStateHydratedRef = useRef(false);
	const chatStateWriteReadyRef = useRef(false);
	const lastChatPathnameRef = useRef(pathname);
	const guestTypingLocalRef = useRef(false);
	const lastGuestSendAtRef = useRef(0);
	const messagesContainerRef = useRef(null);
	const supportRootRef = useRef(null);
	const messagesEndRef = useRef(null);
	const replyTextareaRef = useRef(null);
	const replyInFlightRef = useRef(false);
	const replyAbortControllersRef = useRef(new Set());
	const pendingReplyFingerprintsRef = useRef(new Set());
	const closeInFlightRef = useRef(false);
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
	const supportHotel = useMemo(
		() => ({
			_id: JANNAT_SUPPORT_HOTEL_ID,
			hotelName: chatBrandName,
			belongsTo: JANNAT_SUPPORTER_ID,
		}),
		[chatBrandName]
	);
	const hotelOptions = useMemo(() => [supportHotel, ...hotels], [hotels, supportHotel]);
	const pageHotelSlug = useMemo(() => singleHotelSlugFromPathname(pathname), [pathname]);
	const pageHotel = useMemo(
		() =>
			pageHotelSlug
				? hotels.find((hotel) => hotelSlugKey(hotel) === pageHotelSlug) || null
				: null,
		[hotels, pageHotelSlug]
	);
	const selectedHotel = useMemo(
		() => hotelOptions.find((hotel) => String(hotel._id) === String(form.hotelId)),
		[form.hotelId, hotelOptions]
	);
	const pageHotelDisplayName = useMemo(
		() => supportHotelDisplayName(pageHotel, isChatArabic),
		[isChatArabic, pageHotel]
	);
	const hotelContext =
		selectedHotel && String(selectedHotel._id) !== JANNAT_SUPPORT_HOTEL_ID
			? selectedHotel
			: pageHotel;
	const hotelContextName = supportHotelDisplayName(hotelContext, isChatArabic);
	const receptionChatLabel = isChatArabic ? "تحدث مع الاستقبال" : "Chat With Reception";
	const chatLabel = hotelContext ? receptionChatLabel : chatCopy.customerSupport;
	const chatHeaderTitle = hotelContextName || chatBrandName;
	const chatHeaderSubtitle = hotelContext ? receptionChatLabel : chatCopy.hotelSupport;
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
	const feedbackCopy = CHAT_COPY.English;
	const reservationFlowCompleted = useMemo(
		() =>
			Boolean(
				caseMeta?.aiReservation?.status === "created" ||
					caseMeta?.aiReservation?.confirmationNumber ||
					messages.some((message) =>
						/(single-reservation|reservation confirmation|confirmation number|client-payment)/i.test(
							String(message?.message || "")
						)
					)
			),
		[caseMeta, messages]
	);
	const latestQuickReplySet = useMemo(() => {
		for (let index = messages.length - 1; index >= 0; index -= 1) {
			const message = messages[index];
			if (!message) continue;
			if (messageSenderRole(message, form.contact) === "guest") {
				return { index: -1, replies: [] };
			}
			const quickReplies = quickRepliesForMessage(message);
			if (quickReplies.length) return { index, replies: quickReplies };
			return { index: -1, replies: [] };
		}
		return { index: -1, replies: [] };
	}, [messages, form.contact]);
	const latestAiResponderName = useMemo(() => {
		for (let index = messages.length - 1; index >= 0; index -= 1) {
			const message = messages[index];
			if (messageSenderRole(message, form.contact) !== "guest") {
				return String(message?.messageBy?.customerName || "").trim();
			}
		}
		return "";
	}, [messages, form.contact]);
	const sendingReply = sendingReplyCount > 0;
	const abortPendingReplyRequests = useCallback(() => {
		replyAbortControllersRef.current.forEach((controller) => controller.abort());
		replyAbortControllersRef.current.clear();
		pendingReplyFingerprintsRef.current.clear();
		replyInFlightRef.current = false;
		setSendingReplyCount(0);
	}, []);

	useEffect(() => {
		const refresh = () => setMobileComposer(isMobileComposerViewport());
		refresh();
		window.addEventListener("resize", refresh);
		window.addEventListener("orientationchange", refresh);
		return () => {
			window.removeEventListener("resize", refresh);
			window.removeEventListener("orientationchange", refresh);
		};
	}, []);

	useEffect(() => {
		if (!open || !mobileComposer) return undefined;
		const root = supportRootRef.current;
		const previousBodyOverflow = document.body.style.overflow;
		const previousHtmlOverflow = document.documentElement.style.overflow;
		const refreshViewportHeight = () => {
			if (!root) return;
			const viewport = window.visualViewport;
			const height = viewport?.height || window.innerHeight;
			const width = viewport?.width || window.innerWidth;
			const top = viewport?.offsetTop || 0;
			const left = viewport?.offsetLeft || 0;
			if (!height || !width) return;
			root.style.setProperty("--support-visual-height", `${Math.max(320, Math.floor(height))}px`);
			root.style.setProperty("--support-visual-width", `${Math.max(280, Math.floor(width))}px`);
			root.style.setProperty("--support-visual-top", `${Math.max(0, Math.floor(top))}px`);
			root.style.setProperty("--support-visual-left", `${Math.max(0, Math.floor(left))}px`);
		};
		document.body.style.overflow = "hidden";
		document.documentElement.style.overflow = "hidden";
		refreshViewportHeight();
		const frame = window.requestAnimationFrame(refreshViewportHeight);
		window.visualViewport?.addEventListener("resize", refreshViewportHeight);
		window.visualViewport?.addEventListener("scroll", refreshViewportHeight);
		window.addEventListener("resize", refreshViewportHeight);
		window.addEventListener("orientationchange", refreshViewportHeight);
		return () => {
			document.body.style.overflow = previousBodyOverflow;
			document.documentElement.style.overflow = previousHtmlOverflow;
			window.cancelAnimationFrame(frame);
			root?.style.removeProperty("--support-visual-height");
			root?.style.removeProperty("--support-visual-width");
			root?.style.removeProperty("--support-visual-top");
			root?.style.removeProperty("--support-visual-left");
			window.visualViewport?.removeEventListener("resize", refreshViewportHeight);
			window.visualViewport?.removeEventListener("scroll", refreshViewportHeight);
			window.removeEventListener("resize", refreshViewportHeight);
			window.removeEventListener("orientationchange", refreshViewportHeight);
		};
	}, [mobileComposer, open]);

	useEffect(() => {
		if (caseId || !pageHotel?._id) return;
		const pageHotelId = String(pageHotel._id);
		const nextHotelName = pageHotelDisplayName || titleCase(pageHotel.hotelName);
		const nextDefaultMessage = receptionChatMessageFor(languageName, nextHotelName);
		setForm((current) => {
			if (current.hotelId && String(current.hotelId) !== pageHotelId) return current;
			const currentMessage = String(current.message || "").trim();
			const generatedMessage = String(generatedMessageRef.current || "").trim();
			const manuallyEdited = messageManuallyEditedRef.current;
			const shouldRefreshMessage =
				!currentMessage ||
				(!manuallyEdited &&
					((generatedMessage && currentMessage === generatedMessage) ||
						isGeneratedDefaultChatMessage(currentMessage)));
			const message = shouldRefreshMessage ? nextDefaultMessage : current.message;
			if (shouldRefreshMessage) {
				generatedMessageRef.current = nextDefaultMessage;
				messageManuallyEditedRef.current = false;
			}
			if (
				String(current.hotelId) === pageHotelId &&
				current.hotelName === nextHotelName &&
				current.message === message
			) {
				return current;
			}
			return {
				...current,
				hotelId: pageHotelId,
				hotelName: nextHotelName,
				topic: current.topic || "reserve_room",
				message,
			};
		});
	}, [caseId, languageName, pageHotel, pageHotelDisplayName]);

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

	const pageHotelChatFields = useCallback(
		(overrides = {}) => {
			if (!pageHotel?._id) return overrides;
			const hotelId = String(pageHotel._id);
			const hotelName = pageHotelDisplayName || titleCase(pageHotel.hotelName);
			const currentMessage = String(form.message || "").trim();
			const defaultMessage = receptionChatMessageFor(languageName, hotelName);
			const inquiryDetails =
				overrides.inquiryDetails ||
				(currentMessage && !isGeneratedDefaultChatMessage(currentMessage)
					? currentMessage
					: defaultMessage);
			return {
				hotelId,
				hotelName,
				inquiry: form.topic || "reserve_room",
				inquiryDetails,
				...overrides,
			};
		},
		[form.message, form.topic, languageName, pageHotel, pageHotelDisplayName]
	);

	useEffect(() => {
		if (!open || caseId || !pageHotel?._id) return;
		const queryState = readChatQueryParams(window.location.search);
		if (queryState.hotelId) return;
		writeChatQuery(pageHotelChatFields(), { open: true });
	}, [caseId, open, pageHotel, pageHotelChatFields, writeChatQuery]);

	const showLocalAiTyping = useCallback(
		(options = {}) => {
			const targetCaseId = String(options.caseId || caseId || "").trim();
			if (!targetCaseId || conversationEnded) return;
			window.clearTimeout(localAiTypingDelayTimerRef.current);
			window.clearTimeout(typingStatusTimerRef.current);
			guestTypingLocalRef.current = false;
			setIsGuestTypingLocal(false);
			localAiTypingDelayTimerRef.current = window.setTimeout(() => {
				if (conversationEnded || guestTypingLocalRef.current) return;
				const typingName =
					options.aiResponderName ||
					caseMeta?.aiResponderName ||
					latestAiResponderName ||
					chatBrandName;
				setTypingStatus(
					typingStatusText({
						name: typingName,
						isAi: true,
						languageName,
						fallback: chatCopy.isTyping,
					})
				);
				setTypingStatusIsAi(true);
				window.clearTimeout(typingStatusTimerRef.current);
				typingStatusTimerRef.current = window.setTimeout(() => {
					setTypingStatus("");
					setTypingStatusIsAi(false);
				}, LOCAL_AI_TYPING_VISIBLE_MS);
			}, LOCAL_AI_TYPING_DELAY_MS);
		},
		[
			caseId,
			caseMeta?.aiResponderName,
			chatBrandName,
			chatCopy.isTyping,
			conversationEnded,
			languageName,
			latestAiResponderName,
		]
	);

	const createSupportCaseFromMessage = useCallback(
		async (initialMessage = "", options = {}) => {
			const cleanMessage = String(initialMessage || "").trim();
			if (!form.name.trim() || !form.contact.trim() || !selectedHotel || !cleanMessage) {
				throw supportRequestError(chatCopy.requiredError, 400, "REQUIRED_FIELDS");
			}
			const ownerId = String(selectedHotel?.belongsTo?._id || selectedHotel?.belongsTo || "").trim();
			if (!ownerId) {
				throw supportRequestError(chatCopy.hotelError, 400, "INVALID_HOTEL");
			}
			if (options.commitQuery !== false) {
				commitChatQueryFields({
					name: form.name,
					contact: form.contact,
					hotelId: selectedHotel._id,
					hotelName: selectedHotel.hotelName || form.hotelName,
					inquiry: selectedTopic?.value || "reserve_room",
					inquiryDetails: cleanMessage,
					language: languageName,
				});
			}
			const payload = {
				customerName: form.name,
				displayName1: form.name,
				displayName2: selectedHotel.hotelName || form.hotelName,
				role: 0,
				customerEmail: form.contact,
				hotelId: selectedHotel._id,
				inquiryAbout: selectedTopic?.value || "reserve_room",
				inquiryDetails: `[Preferred Language: ${languageName} (${languageCode})] [Topic: ${
					selectedTopic?.label || "Room booking or availability"
				}] ${cleanMessage}`,
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
				initialClientMessage: cleanMessage,
				initialClientTag: supportClientTag(),
			};
			const res = await fetch(apiUrl("/support-cases/new"), {
				method: "POST",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				body: JSON.stringify(payload),
			});
			const data = await readResponseJson(res);
			if (!res.ok || data?.error) {
				throw supportRequestError(data?.error || chatCopy.startError, res.status, data?.code);
			}
			setCaseId(data._id);
			setCaseMeta(data);
			setMessages(mergeConversationMessages([], data.conversation || []));
			showLocalAiTyping({
				caseId: data._id,
				aiResponderName: data.aiResponderName,
			});
			if (options.track !== false) {
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
			}
			return data;
		},
		[
			chatCopy.hotelError,
			chatCopy.requiredError,
			chatCopy.startError,
			commitChatQueryFields,
			form.contact,
			form.hotelName,
			form.name,
			languageCode,
			languageName,
			selectedHotel,
			selectedTopic,
			showLocalAiTyping,
		]
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
			clearStoredSupportChatState();
			writeChatQuery({}, { close: true, clearFields: true });
			return;
		}
		writeStoredSupportChatState({
			open: false,
			caseId,
			form,
			chatLanguage: languageName,
			caseStatus: caseMeta?.caseStatus || "",
			conversationEnded,
			ratingVisible,
		});
		const nextSearch = mergeChatQueryParams(window.location.search, {}, { close: true });
		replaceSearchWithoutReload(nextSearch);
	}, [caseId, caseMeta?.caseStatus, conversationEnded, form, languageName, ratingVisible, writeChatQuery]);

	const resetCaseState = useCallback(() => {
		window.clearTimeout(typingStatusTimerRef.current);
		window.clearTimeout(localAiTypingDelayTimerRef.current);
		window.clearTimeout(guestTypingTimerRef.current);
		abortPendingReplyRequests();
		closeInFlightRef.current = false;
		clearStoredSupportChatState();
		setBusy(false);
		setClosingChat(false);
		setCaseId("");
		setCaseMeta(null);
		setMessages([]);
		setReply("");
		setTypingStatus("");
		setTypingStatusIsAi(false);
		setEmojiOpen(false);
		setRatingVisible(false);
		setConversationEnded(false);
		setIsGuestTypingLocal(false);
		guestTypingLocalRef.current = false;
	}, [abortPendingReplyRequests]);

	useEffect(() => {
		const applyQueryState = () => {
			const queryState = readChatQueryParams(window.location.search);
			const storedState = readStoredSupportChatState();
			const params = new URLSearchParams(window.location.search || "");
			const hasChatParam = params.has(CHAT_OPEN_PARAM);
			const queryHotelId = String(queryState.hotelId || "").trim();
			const storedForm = storedState?.form || {};
			const storedHotelId = String(storedForm.hotelId || "").trim();
			const pageHotelId = String(pageHotel?._id || "").trim();
			const storedMatchesPageHotel = Boolean(
				pageHotelId && storedHotelId && storedHotelId === pageHotelId
			);
			const queryMatchesStoredHotel = Boolean(
				queryState.isOpen && queryHotelId && storedHotelId && queryHotelId === storedHotelId
			);
			const canRestoreStoredOpen =
				!hasChatParam && storedState?.open === true && storedMatchesPageHotel;
			const shouldOpen = queryState.isOpen || canRestoreStoredOpen;
			const canUseStoredState = Boolean(
				canRestoreStoredOpen ||
					queryMatchesStoredHotel ||
					(queryState.isOpen && !queryHotelId && storedMatchesPageHotel)
			);
			const shouldClearStaleStoredState = Boolean(
				storedState &&
					!queryState.isOpen &&
					(storedState.open === true || storedState.caseId) &&
					(isHomePathname(pathname) ||
						(pageHotelId && storedHotelId && storedHotelId !== pageHotelId))
			);
			if (shouldClearStaleStoredState) {
				clearStoredSupportChatState();
			}
			const queryLanguage = normalizeChatLanguage(queryState.language);
			const storedLanguage = canUseStoredState
				? normalizeChatLanguage(storedState?.chatLanguage)
				: "";
			setOpen((current) => (current === shouldOpen ? current : shouldOpen));
			setChatLanguage((current) => {
				if (queryLanguage) return current === queryLanguage ? current : queryLanguage;
				if (caseId) return current;
				if (storedLanguage) return current === storedLanguage ? current : storedLanguage;
				return current === siteDefaultChatLanguage ? current : siteDefaultChatLanguage;
			});
			if (!caseId && storedState?.caseId && canUseStoredState) {
				const explicitDifferentHotel =
					queryState.isOpen && queryHotelId && storedHotelId && queryHotelId !== storedHotelId;
				if (!explicitDifferentHotel) {
					setCaseId(String(storedState.caseId));
					setConversationEnded(Boolean(storedState.conversationEnded));
					setRatingVisible(Boolean(storedState.ratingVisible));
				}
			}
			chatStateHydratedRef.current = true;
			if (!shouldOpen || caseId) return;
			const usableStoredForm = canUseStoredState ? storedForm : {};
			setForm((current) => ({
				...current,
				name: queryState.name || usableStoredForm.name || current.name,
				contact: queryState.contact || usableStoredForm.contact || current.contact,
				hotelId: queryState.hotelId || usableStoredForm.hotelId || current.hotelId,
				hotelName: queryState.hotelName || usableStoredForm.hotelName || current.hotelName,
				topic: queryState.inquiry || usableStoredForm.topic || current.topic || "reserve_room",
				message: queryState.inquiryDetails || usableStoredForm.message || current.message,
			}));
		};
		applyQueryState();
		window.addEventListener("popstate", applyQueryState);
		return () => window.removeEventListener("popstate", applyQueryState);
	}, [caseId, pageHotel?._id, pathname, siteDefaultChatLanguage]);

	useEffect(() => {
		if (!chatStateHydratedRef.current) return;
		if (!chatStateWriteReadyRef.current) {
			chatStateWriteReadyRef.current = true;
			return;
		}
		writeStoredSupportChatState({
			open,
			caseId,
			form,
			chatLanguage: languageName,
			caseStatus: caseMeta?.caseStatus || "",
			conversationEnded,
			ratingVisible,
		});
	}, [caseId, caseMeta?.caseStatus, conversationEnded, form, languageName, open, ratingVisible]);

	useEffect(() => {
		if (!open) {
			lastChatPathnameRef.current = pathname;
			return;
		}
		if (lastChatPathnameRef.current === pathname) return;
		lastChatPathnameRef.current = pathname;
		writeChatQuery(
			{
				name: form.name,
				contact: form.contact,
				hotelId: form.hotelId,
				hotelName: form.hotelName,
				inquiry: form.topic,
				inquiryDetails: form.message,
				language: languageName,
			},
			{ open: true }
		);
	}, [
		form.contact,
		form.hotelId,
		form.hotelName,
		form.message,
		form.name,
		form.topic,
		languageName,
		open,
		pathname,
		writeChatQuery,
	]);

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
		if (!caseId || !open || conversationEnded) return undefined;
		let cancelled = false;
		const load = async () => {
			try {
				const res = await fetch(apiUrl(`/support-cases/client/${caseId}`));
				const data = await res.json();
				if (!res.ok || data?.error) {
					if (!cancelled && [400, 404, 410].includes(Number(res.status))) {
						resetCaseState();
						setOpen(false);
						writeChatQuery({}, { close: true, clearFields: true });
					}
					return;
				}
				if (!cancelled && data?.caseStatus === "closed") {
					setCaseMeta(data);
					if (Array.isArray(data?.conversation)) {
						setMessages((current) => mergeConversationMessages(current, data.conversation));
					}
					setConversationEnded(true);
					setRatingVisible(true);
					setEmojiOpen(false);
					setNotice("");
					return;
				}
				if (!cancelled && Array.isArray(data?.conversation)) {
					setCaseMeta(data);
					setMessages((current) => mergeConversationMessages(current, data.conversation));
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
	}, [caseId, conversationEnded, open, resetCaseState, chatCopy.chatClosed, writeChatQuery]);

	useEffect(() => {
		if (!caseId || !open || conversationEnded) return undefined;
		let mounted = true;
		let socket = null;

		const onReceiveMessage = (message = {}) => {
			if (message.caseId && String(message.caseId) !== String(caseId)) return;
			if (message.isAi === true) {
				window.clearTimeout(localAiTypingDelayTimerRef.current);
				setTypingStatus("");
				setTypingStatusIsAi(false);
			}
			setMessages((current) => mergeConversationMessages(current, [message]));
		};
		const onTyping = (data = {}) => {
			if (data.caseId && String(data.caseId) !== String(caseId)) return;
			const isAiTyping = data.isAi === true;
			if (!isAiTyping && data.name && data.name === form.name) return;
			if (!isAiTyping && guestTypingLocalRef.current) return;
			if (isAiTyping) {
				window.clearTimeout(localAiTypingDelayTimerRef.current);
				if (guestTypingLocalRef.current) return;
			}
			const typingName =
				data.name || (isAiTyping && caseMeta?.aiResponderName) || chatBrandName;
			setTypingStatus(
				typingStatusText({
					name: typingName,
					isAi: isAiTyping,
					languageName,
					fallback: chatCopy.isTyping,
				})
			);
			setTypingStatusIsAi(isAiTyping);
			window.clearTimeout(typingStatusTimerRef.current);
			typingStatusTimerRef.current = window.setTimeout(() => {
				setTypingStatus("");
				setTypingStatusIsAi(false);
			}, isAiTyping ? LOCAL_AI_TYPING_VISIBLE_MS : 4500);
		};
		const onStopTyping = (data = {}) => {
			if (data.caseId && String(data.caseId) !== String(caseId)) return;
			const isAiTyping = data.isAi === true;
			if (!isAiTyping && data.name && data.name === form.name) return;
			if (!isAiTyping && !data.name) return;
			if (isAiTyping) window.clearTimeout(localAiTypingDelayTimerRef.current);
			setTypingStatus("");
			setTypingStatusIsAi(false);
		};
		const onCloseCase = (payload = {}) => {
			const closedCaseId = String(payload?.case?._id || payload?.caseId || "");
			if (closedCaseId && closedCaseId !== String(caseId)) return;
			if (payload?.case) {
				setCaseMeta(payload.case);
				if (Array.isArray(payload.case.conversation)) {
					setMessages((current) => mergeConversationMessages(current, payload.case.conversation));
				}
			}
			setConversationEnded(true);
			setRatingVisible(true);
			setEmojiOpen(false);
			window.clearTimeout(localAiTypingDelayTimerRef.current);
			setTypingStatus("");
			setTypingStatusIsAi(false);
			setNotice("");
		};
		const onSupportCaseUpdated = (updatedCase = {}) => {
			const updatedCaseId = String(updatedCase?._id || updatedCase?.caseId || "");
			if (!updatedCaseId || updatedCaseId !== String(caseId)) return;
			setCaseMeta(updatedCase);
			if (Array.isArray(updatedCase.conversation)) {
				setMessages((current) => mergeConversationMessages(current, updatedCase.conversation));
			}
			if (updatedCase.caseStatus === "closed") {
				onCloseCase({ case: updatedCase, caseId: updatedCaseId });
			}
		};
		const joinCurrentRoom = () => {
			socket?.emit("joinRoom", { caseId });
		};

		const connectSocket = async () => {
			const { io } = await import("socket.io-client");
			if (!mounted) return;
			socket = io(socketBaseUrl, {
				transports: ["websocket", "polling"],
				withCredentials: false,
			});
			socketRef.current = socket;
			socket.on("receiveMessage", onReceiveMessage);
			socket.on("typing", onTyping);
			socket.on("stopTyping", onStopTyping);
			socket.on("closeCase", onCloseCase);
			socket.on("supportCaseUpdated", onSupportCaseUpdated);
			socket.on("connect", joinCurrentRoom);
			if (socket.connected) joinCurrentRoom();
		};

		connectSocket().catch((err) => console.error(err));

		return () => {
			mounted = false;
			window.clearTimeout(typingStatusTimerRef.current);
			window.clearTimeout(localAiTypingDelayTimerRef.current);
			window.clearTimeout(guestTypingTimerRef.current);
			if (socket) {
				socket.emit("leaveRoom", { caseId });
				socket.off("receiveMessage", onReceiveMessage);
				socket.off("typing", onTyping);
				socket.off("stopTyping", onStopTyping);
				socket.off("closeCase", onCloseCase);
				socket.off("supportCaseUpdated", onSupportCaseUpdated);
				socket.off("connect", joinCurrentRoom);
				socket.disconnect();
			}
			socketRef.current = null;
		};
	}, [caseId, caseMeta?.aiResponderName, conversationEnded, form.name, open, resetCaseState, chatBrandName, chatCopy.chatClosed, chatCopy.isTyping, languageName]);

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

	const syncReplyTextareaHeight = useCallback(() => {
		const node = replyTextareaRef.current;
		if (!node) return;
		node.style.height = "44px";
		const nextHeight = Math.min(128, Math.max(44, node.scrollHeight));
		node.style.height = `${nextHeight}px`;
	}, []);

	useEffect(() => {
		syncReplyTextareaHeight();
	}, [reply, caseId, syncReplyTextareaHeight]);

	const startChat = async (event) => {
		event?.preventDefault?.();
		setError("");
		setNotice("");
		setBusy(true);
		try {
			await createSupportCaseFromMessage(form.message);
		} catch (err) {
			setError(err.message || chatCopy.startError);
		} finally {
			setBusy(false);
		}
	};

	const emitTyping = (value) => {
		const socket = socketRef.current;
		if (!socket || !caseId || conversationEnded) return;
		if (value) {
			window.clearTimeout(localAiTypingDelayTimerRef.current);
			if (typingStatusIsAi) {
				window.clearTimeout(typingStatusTimerRef.current);
				setTypingStatus("");
				setTypingStatusIsAi(false);
			}
			guestTypingLocalRef.current = true;
			setIsGuestTypingLocal(true);
			socket.emit("typing", { name: form.name || "Guest", caseId });
			window.clearTimeout(guestTypingTimerRef.current);
			guestTypingTimerRef.current = window.setTimeout(() => {
				socket.emit("stopTyping", { name: form.name || "Guest", caseId });
				guestTypingLocalRef.current = false;
				setIsGuestTypingLocal(false);
			}, LOCAL_GUEST_TYPING_IDLE_MS);
		} else {
			socket.emit("stopTyping", { name: form.name || "Guest", caseId });
			window.clearTimeout(guestTypingTimerRef.current);
			guestTypingLocalRef.current = false;
			setIsGuestTypingLocal(false);
		}
	};

	const handleReplyChange = (event) => {
		setReply(event.target.value);
		emitTyping(event.target.value);
	};

	const insertEmoji = (emoji) => {
		const node = replyTextareaRef.current;
		const current = reply || "";
		const start = typeof node?.selectionStart === "number" ? node.selectionStart : current.length;
		const end = typeof node?.selectionEnd === "number" ? node.selectionEnd : current.length;
		const next = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
		setReply(next);
		emitTyping(next);
		window.requestAnimationFrame(() => {
			node?.focus();
			const caret = start + emoji.length;
			node?.setSelectionRange?.(caret, caret);
			syncReplyTextareaHeight();
		});
	};

	const sendReply = async (event, overrideText = "", options = {}) => {
		event?.preventDefault?.();
		const messageText = String(overrideText || reply || "").trim();
		if (!caseId || !messageText || closeInFlightRef.current || conversationEnded) return;
		const pendingFingerprint = `${String(options.clientAction || "").trim()}|${normalizedMessageText(
			messageText
		)}`;
		if (pendingReplyFingerprintsRef.current.has(pendingFingerprint)) return;
		pendingReplyFingerprintsRef.current.add(pendingFingerprint);
		replyInFlightRef.current = true;
		setSendingReplyCount((current) => current + 1);
		setError("");
		setNotice("");
		const clientTag = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const controller = new AbortController();
		const timeout = window.setTimeout(() => controller.abort(), SUPPORT_SEND_TIMEOUT_MS);
		replyAbortControllersRef.current.add(controller);
		const verifySavedMessage = async () => {
			for (let attempt = 0; attempt < 2; attempt += 1) {
				if (attempt > 0) await wait(1200);
				const verifyController = new AbortController();
				const verifyTimeout = window.setTimeout(
					() => verifyController.abort(),
					SUPPORT_SEND_VERIFY_TIMEOUT_MS
				);
				try {
					const res = await fetch(apiUrl(`/support-cases/client/${caseId}`), {
						headers: { Accept: "application/json" },
						signal: verifyController.signal,
					});
					const data = await readResponseJson(res);
					if (!res.ok || !Array.isArray(data?.conversation)) continue;
					const saved = data.conversation.some(
						(message) => normalizedClientTag(message) === clientTag
					);
					if (!saved) continue;
					setCaseMeta(data);
					setMessages((current) => mergeConversationMessages(current, data.conversation || []));
					return true;
				} catch {
					// The normal polling loop will keep trying; this check only prevents false failures.
				} finally {
					window.clearTimeout(verifyTimeout);
				}
			}
			return false;
		};
		try {
			const conversation = {
				messageBy: {
					customerName: form.name || "Guest",
					customerEmail: form.contact || "guest@jannatbooking.com",
				},
				message: messageText,
				date: new Date().toISOString(),
				clientTag,
				inquiryAbout: "support",
				inquiryDetails: messageText,
				clientAction: String(options.clientAction || "").trim(),
				preferredLanguage: languageName,
				preferredLanguageCode: languageCode,
			};
			lastGuestSendAtRef.current = Date.now();
			setMessages((current) => mergeConversationMessages(current, [conversation]));
			setReply("");
			setEmojiOpen(false);
			emitTyping("");
			showLocalAiTyping();
			const res = await fetch(apiUrl(`/support-cases/client/${caseId}`), {
				method: "PUT",
				headers: { "Content-Type": "application/json", Accept: "application/json" },
				body: JSON.stringify({ conversation }),
				signal: controller.signal,
			});
			const data = await readResponseJson(res);
			if (!res.ok || data?.error) {
				throw supportRequestError(data?.error || chatCopy.messageError, res.status, data?.code);
			}
			setCaseMeta(data);
			setMessages((current) => mergeConversationMessages(current, data.conversation || []));
		} catch (err) {
			if (isClosedSupportCaseError(err)) {
				emitTyping("");
				resetCaseState();
				try {
					await createSupportCaseFromMessage(messageText, { track: false });
					setNotice(chatCopy.chatRestarted || chatCopy.chatClosed);
				} catch (restartError) {
					setNotice(chatCopy.chatClosed);
					setError(restartError.message || chatCopy.startError);
				}
				return;
			}
			if (isAbortError(err) && closeInFlightRef.current) {
				return;
			}
			if (isAbortError(err) && (await verifySavedMessage())) {
				setError("");
				return;
			}
			setMessages((current) => current.filter((message) => messageKey(message) !== clientTag));
			setReply((current) => {
				const draft = String(current || "").trim();
				return draft ? `${messageText}\n${current}` : messageText;
			});
			setError(isAbortError(err) ? chatCopy.messageError : err.message || chatCopy.messageError);
		} finally {
			window.clearTimeout(timeout);
			pendingReplyFingerprintsRef.current.delete(pendingFingerprint);
			replyAbortControllersRef.current.delete(controller);
			if (!replyAbortControllersRef.current.size) replyInFlightRef.current = false;
			setSendingReplyCount((current) => Math.max(0, current - 1));
		}
	};

	const handleReplyKeyDown = (event) => {
		if (
			event.key !== "Enter" ||
			event.shiftKey ||
			event.nativeEvent?.isComposing ||
			isMobileComposerViewport()
		) {
			return;
		}
		event.preventDefault();
		sendReply(event);
	};

	const handleQuickReply = (quickReply) => {
		const value = String(quickReply?.value || quickReply?.label || "").trim();
		if (!value || closeInFlightRef.current || conversationEnded || replyInFlightRef.current) return;
		setReply("");
		sendReply(null, value, { clientAction: quickReply?.action || "" });
	};

	const requireClosedCase = (closedCase) => {
		if (closedCase?.caseStatus !== "closed") {
			throw new Error(chatCopy.closeError || "The chat could not be closed. Please try again.");
		}
		return closedCase;
	};

	const endChat = () => {
		if (!caseId || closeInFlightRef.current || ratingVisible) return;
		const closingCaseId = caseId;
		abortPendingReplyRequests();
		closeInFlightRef.current = true;
		setClosingChat(true);
		setBusy(true);
		setError("");
		setConversationEnded(true);
		setRatingVisible(true);
		setEmojiOpen(false);
		setNotice("");
		socketRef.current?.emit("leaveRoom", { caseId: closingCaseId });
		closePublicSupportCase(closingCaseId)
			.then(requireClosedCase)
			.then((closedCase) => {
				setCaseMeta(closedCase);
				if (Array.isArray(closedCase?.conversation)) {
					setMessages((current) => mergeConversationMessages(current, closedCase.conversation));
				}
				closeInFlightRef.current = false;
				setClosingChat(false);
				setBusy(false);
			})
			.catch((err) => {
				closeInFlightRef.current = false;
				setClosingChat(false);
				setBusy(false);
				setConversationEnded(false);
				setRatingVisible(false);
				setError(err.message || chatCopy.closeError);
				socketRef.current?.emit("joinRoom", { caseId: closingCaseId });
			});
	};

	const closeChatWithRating = (selectedRating = null) => {
		if (!caseId || closeInFlightRef.current) return;
		const closingCaseId = caseId;
		const previousState = {
			caseMeta,
			messages,
			reply,
			typingStatus,
			typingStatusIsAi,
			conversationEnded,
			ratingVisible,
		};
		closeInFlightRef.current = true;
		setClosingChat(true);
		setError("");
		const payload = selectedRating ? { rating: selectedRating } : {};
		const successNotice = selectedRating
			? chatCopy.ratingThanks || feedbackCopy.ratingThanks
			: chatCopy.chatClosed;
		socketRef.current?.emit("leaveRoom", { caseId: closingCaseId });
		resetCaseState();
		setNotice(successNotice);

		closePublicSupportCase(closingCaseId, payload)
			.then(requireClosedCase)
			.then(() => {
				closeInFlightRef.current = false;
				setClosingChat(false);
			})
			.catch((err) => {
				closeInFlightRef.current = false;
				setClosingChat(false);
				setCaseId(closingCaseId);
				setCaseMeta(previousState.caseMeta);
				setMessages(previousState.messages);
				setReply(previousState.reply);
				setTypingStatus(previousState.typingStatus);
				setTypingStatusIsAi(previousState.typingStatusIsAi);
				setConversationEnded(previousState.conversationEnded || true);
				setRatingVisible(previousState.ratingVisible || true);
				setNotice("");
				setError(err.message || chatCopy.closeError);
				socketRef.current?.emit("joinRoom", { caseId: closingCaseId });
			});
	};

	const submitRating = () => closeChatWithRating(rating);
	const skipRating = () => closeChatWithRating(null);

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
		<div
			className={`support-root${open ? " is-open" : ""}`}
			dir={selectedChatLanguageMeta.rtl ? "rtl" : "ltr"}
			ref={supportRootRef}
		>
			<button
				className="support-button"
				type="button"
				onClick={() => openChatPanel(pageHotelChatFields(), "Chat Window Opened_Main")}
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
							<strong>{chatHeaderTitle}</strong>
							<span>{chatHeaderSubtitle}</span>
						</div>
						<div className="support-head-actions">
							{caseId ? (
								<button
									className={`support-end-chat${reservationFlowCompleted ? " is-ready" : ""}${
										closingChat ? " is-ending" : ""
									}`}
									type="button"
									onClick={endChat}
									disabled={closingChat || ratingVisible}
								>
									<HeartHandshake size={15} />
									<span>{chatCopy.endChat}</span>
								</button>
							) : null}
							<button className="support-close" type="button" onClick={closeChatPanel} aria-label="Close support">
								<X size={20} />
							</button>
						</div>
					</header>
					{notice ? <p className="notice">{notice}</p> : null}
					{caseId ? (
						ratingVisible ? (
							<div className="rating-panel" role="group" aria-label={chatCopy.rateConversation || feedbackCopy.rateConversation}>
								<div className="rating-card">
									<div className="rating-mark" aria-hidden="true">
										<HeartHandshake size={27} />
									</div>
									<div className="rating-copy">
										<strong>{chatCopy.rateConversation || feedbackCopy.rateConversation}</strong>
										<p>{chatCopy.ratingCaption || CHAT_COPY.English.ratingCaption}</p>
									</div>
									<div className="rating-stars" aria-label={chatCopy.rateConversation || feedbackCopy.rateConversation}>
										{[1, 2, 3, 4, 5].map((value) => (
											<button
												key={value}
												type="button"
												className={`rating-star${value <= rating ? " is-active" : ""}`}
												onClick={() => setRating(value)}
												aria-label={`${value} / 5`}
												aria-pressed={value <= rating}
											>
												<Star size={22} />
											</button>
										))}
									</div>
									<div className="rating-actions">
										<button type="button" className="rating-submit" onClick={submitRating} disabled={closingChat}>
											{chatCopy.submitRating || feedbackCopy.submitRating}
										</button>
										<button type="button" className="rating-skip" onClick={skipRating} disabled={closingChat}>
											{chatCopy.skipRating || feedbackCopy.skipRating}
										</button>
									</div>
								</div>
							</div>
						) : (
							<>
							<div className="messages" ref={messagesContainerRef} role="log" aria-live="polite">
								{messages.map((message, index) => {
									const sender = brandText(message?.messageBy?.customerName || "Support", isChatArabic);
									const text = brandText(message?.message || "", isChatArabic);
									const isGuest = messageSenderRole(message, form.contact) === "guest";
									const messageDirection = messageTextDirection(text);
									const quickReplies = quickRepliesForMessage(message);
									const showQuickReplies =
										!isGuest &&
										quickReplies.length > 0 &&
										latestQuickReplySet.index === index;
									return (
										<div className={`bubble ${isGuest ? "guest" : "agent"}`} key={`${index}-${messageKey(message)}`}>
											<span className="message-sender">{sender}</span>
											<div className="message-content" dir={messageDirection}>
												{renderMessageContent(text)}
											</div>
											{showQuickReplies ? (
												<div className="quick-replies">
													{quickReplies.map((quickReply) => (
														<button
															key={`${quickReply.action || quickReply.label}-${quickReply.value}`}
															type="button"
															className="quick-reply"
															onClick={() => handleQuickReply(quickReply)}
															disabled={closingChat || sendingReply}
														>
															{brandText(quickReply.label, isChatArabic)}
														</button>
													))}
												</div>
											) : null}
										</div>
									);
								})}
								{typingStatus && !isGuestTypingLocal ? <div className="typing-line">{typingStatus}</div> : null}
								<div ref={messagesEndRef} />
							</div>
							{!conversationEnded && latestQuickReplySet.replies.length > 0 ? (
								<div className="quick-reply-tray" role="group" aria-label={chatCopy.quickReplies || "Quick replies"}>
									{latestQuickReplySet.replies.map((quickReply) => (
										<button
											key={`${quickReply.action || quickReply.label}-${quickReply.value}`}
											type="button"
											className="quick-reply tray-action"
											onClick={() => handleQuickReply(quickReply)}
											disabled={closingChat || sendingReply}
										>
											{brandText(quickReply.label, isChatArabic)}
										</button>
									))}
								</div>
							) : null}
							{conversationEnded ? null : (
								<form
									className={`reply-form${sendingReply ? " is-sending" : ""}`}
									onSubmit={sendReply}
									aria-busy={sendingReply}
								>
									<button
										type="button"
										className="emoji-toggle"
										onClick={() => setEmojiOpen((current) => !current)}
										aria-label={chatCopy.emojiPicker || feedbackCopy.emojiPicker}
									>
										<Smile size={18} />
									</button>
									{emojiOpen ? (
										<div className="emoji-popover" role="listbox" aria-label={chatCopy.emojiPicker || feedbackCopy.emojiPicker}>
											{COMMON_CHAT_EMOJIS.map((emoji) => (
												<button
													key={emoji}
													type="button"
													className="emoji-choice"
													onClick={() => insertEmoji(emoji)}
													aria-label={emoji}
												>
													{emoji}
												</button>
											))}
										</div>
									) : null}
									<textarea
										ref={replyTextareaRef}
										value={reply}
										dir="auto"
										rows={1}
										onChange={handleReplyChange}
										onKeyDown={handleReplyKeyDown}
										placeholder={chatCopy.typeMessage}
										enterKeyHint={mobileComposer ? "enter" : "send"}
										inputMode="text"
										spellCheck
									/>
									<button className="send-reply" type="submit" disabled={closingChat || !reply.trim()} aria-label="Send message">
										<Send size={18} />
									</button>
								</form>
							)}
							</>
						)
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
											{supportHotelDisplayName(hotel, isChatArabic)}
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
					max-height: min(720px, calc(100dvh - 92px));
					min-height: 0;
					display: flex;
					flex-direction: column;
					background: #fff;
					border: 1px solid rgba(36, 84, 125, 0.16);
					border-radius: 8px;
					overflow: hidden;
					overscroll-behavior: contain;
					box-shadow: 0 24px 55px rgba(8, 9, 13, 0.26);
				}

				.support-head {
					flex: 0 0 auto;
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
					min-width: 0;
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
					padding: 0 11px;
					font-size: 12px;
					font-weight: 950;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 6px;
					border-color: rgba(255, 196, 205, 0.34);
					background:
						linear-gradient(135deg, rgba(255, 255, 255, 0.18), transparent 32%),
						linear-gradient(135deg, #8f1423 0%, #c62a3f 56%, #7f1020 100%);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.22),
						0 8px 18px rgba(127, 16, 32, 0.24);
					transition:
						transform 160ms ease,
						background 160ms ease,
						color 160ms ease,
						box-shadow 160ms ease;
				}

				.support-end-chat svg {
					flex: 0 0 auto;
					stroke-width: 2.35;
				}

				.support-end-chat:hover:not(:disabled),
				.support-end-chat:focus-visible {
					transform: translateY(-1px);
					background:
						linear-gradient(135deg, rgba(255, 255, 255, 0.22), transparent 32%),
						linear-gradient(135deg, #9e1929 0%, #db364b 56%, #8d1526 100%);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.26),
						0 10px 22px rgba(127, 16, 32, 0.3);
				}

				.support-end-chat.is-ready {
					color: #fff;
					background:
						linear-gradient(115deg, rgba(255, 255, 255, 0.24), transparent 28%, rgba(255, 255, 255, 0.16) 48%, transparent 68%),
						linear-gradient(135deg, #9d1628 0%, #e43a52 58%, #891426 100%);
					border-color: rgba(255, 214, 221, 0.58);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.3),
						0 0 0 1px rgba(255, 169, 184, 0.18),
						0 10px 22px rgba(127, 16, 32, 0.28);
					animation: jannatHeartGlow 1.7s ease-in-out infinite;
				}

				.support-end-chat.is-ready svg {
					animation: jannatHeartBeat 1.7s ease-in-out infinite;
					transform-origin: center;
				}

				.support-end-chat.is-ending,
				.support-end-chat:disabled {
					animation: none;
					opacity: 0.78;
					cursor: default;
					transform: none;
				}

				.support-end-chat.is-ending svg,
				.support-end-chat:disabled svg {
					animation: none;
				}

				@keyframes jannatHeartGlow {
					0%,
					100% {
						box-shadow:
							inset 0 1px rgba(255, 255, 255, 0.3),
							0 0 0 1px rgba(255, 169, 184, 0.18),
							0 10px 22px rgba(127, 16, 32, 0.28);
					}
					45% {
						box-shadow:
							inset 0 1px rgba(255, 255, 255, 0.32),
							0 0 0 4px rgba(255, 169, 184, 0.14),
							0 12px 26px rgba(127, 16, 32, 0.32);
					}
				}

				@keyframes jannatHeartBeat {
					0%,
					100% {
						transform: scale(1);
					}
					18% {
						transform: scale(1.04);
					}
					34% {
						transform: scale(0.99);
					}
					50% {
						transform: scale(1.025);
					}
				}

				.support-close {
					width: 36px;
					height: 36px;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					position: relative;
					overflow: hidden;
					border-color: rgba(143, 234, 255, 0.42);
					background:
						linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent 34%),
						linear-gradient(135deg, #183d68 0%, #117f88 54%, #0b8f6a 100%);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.28),
						0 10px 20px rgba(7, 21, 38, 0.26),
						0 0 0 1px rgba(143, 234, 255, 0.12);
					transition:
						transform 160ms ease,
						filter 160ms ease,
						box-shadow 160ms ease;
				}

				.support-close::before {
					content: "";
					position: absolute;
					inset: 1px;
					border-radius: inherit;
					background: linear-gradient(135deg, rgba(255, 255, 255, 0.32), transparent 42%, rgba(255, 255, 255, 0.12) 58%, transparent 72%);
					pointer-events: none;
				}

				.support-close svg {
					position: relative;
					z-index: 1;
					stroke-width: 2.55;
					filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.22));
				}

				.support-close:hover,
				.support-close:focus-visible {
					transform: translateY(-1px);
					filter: saturate(1.08);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.32),
						0 12px 24px rgba(7, 21, 38, 0.3),
						0 0 0 3px rgba(143, 234, 255, 0.18);
				}

				.start-form,
				.messages {
					padding: 18px;
				}

				.start-form {
					flex: 1 1 auto;
					min-height: 0;
					overflow-y: auto;
					overscroll-behavior: contain;
					scrollbar-width: thin;
					scrollbar-color: rgba(36, 84, 125, 0.24) transparent;
					display: grid;
					gap: 12px;
					background: #fff;
				}

				.start-form::-webkit-scrollbar {
					width: 8px;
				}

				.start-form::-webkit-scrollbar-track {
					background: transparent;
				}

				.start-form::-webkit-scrollbar-thumb {
					border-radius: 999px;
					background: rgba(36, 84, 125, 0.22);
					border: 2px solid rgba(255, 255, 255, 0.8);
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
					white-space: pre-wrap;
					overflow-wrap: anywhere;
					word-break: break-word;
				}

				.support-form .btn {
					width: 100%;
					min-height: 48px;
					margin-top: 2px;
					position: sticky;
					bottom: 0;
					z-index: 2;
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
					min-width: 0;
					border-radius: 8px;
					padding: 9px 10px;
					background: #ffffff;
					border: 1px solid rgba(36, 84, 125, 0.12);
					overflow-wrap: anywhere;
					box-shadow: 0 8px 18px rgba(15, 20, 35, 0.06);
				}

				.bubble.agent {
					align-self: flex-start;
					color: #152236;
					background:
						linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 250, 248, 0.96)),
						#ffffff;
					border-color: rgba(11, 143, 106, 0.18);
				}

				.bubble.guest {
					align-self: flex-end;
					margin-left: auto;
					color: #fff;
					background:
						linear-gradient(135deg, #163b63 0%, #24547d 58%, #0b8f6a 100%),
						var(--zad-blue);
					border-color: rgba(20, 66, 102, 0.95);
					box-shadow: 0 10px 22px rgba(13, 53, 86, 0.18);
				}

				.bubble > .message-sender {
					display: block;
					font-size: 11px;
					font-weight: 950;
					margin-bottom: 4px;
					letter-spacing: 0;
				}

				.bubble.agent > .message-sender {
					color: #0b8f6a;
				}

				.bubble.guest > .message-sender {
					color: rgba(255, 255, 255, 0.86);
				}

				.bubble .message-content {
					margin: 0;
					display: block;
					line-height: 1.58;
					font-size: 14.5px;
					overflow-wrap: anywhere;
					word-break: break-word;
					text-align: start;
					direction: inherit;
					unicode-bidi: isolate;
				}

				:global(.message-line) {
					display: block;
					white-space: pre-wrap;
					max-width: 100%;
					text-align: start;
					direction: inherit;
					unicode-bidi: isolate;
				}

				:global(.message-line[dir="rtl"]) {
					text-align: right;
				}

				:global(.message-line[dir="ltr"]) {
					text-align: left;
				}

				:global(.message-line.has-bullet) {
					display: grid;
					grid-template-columns: auto minmax(0, 1fr);
					align-items: start;
					gap: 7px;
					padding-inline-start: 0;
				}

				:global(.message-line.has-bullet[dir="rtl"]) {
					grid-template-columns: minmax(0, 1fr) auto;
				}

				:global(.message-line.has-bullet[dir="rtl"] .message-bullet) {
					grid-column: 2;
				}

				:global(.message-line.has-bullet[dir="rtl"] .message-body) {
					grid-column: 1;
					grid-row: 1;
				}

				:global(.message-body) {
					min-width: 0;
					display: inline;
					white-space: pre-wrap;
					overflow-wrap: anywhere;
					word-break: break-word;
					direction: inherit;
					unicode-bidi: isolate;
				}

				:global(.message-body[dir="rtl"]) {
					text-align: right;
				}

				:global(.message-body[dir="ltr"]) {
					text-align: left;
				}

				:global(.message-ltr) {
					direction: ltr;
					unicode-bidi: isolate;
				}

				:global(.message-auto) {
					unicode-bidi: isolate;
				}

				:global(.message-line + .message-line) {
					margin-top: 5px;
				}

				:global(.message-break) {
					display: block;
					height: 8px;
				}

				:global(.message-bullet) {
					font-weight: 900;
					color: #0b8f6a;
					display: inline-flex;
					align-items: flex-start;
					justify-content: center;
					min-width: 1.1em;
					line-height: 1.55;
					margin-inline-end: 0;
				}

				.bubble.guest :global(.message-bullet) {
					color: #ffffff;
				}

				:global(.message-label),
				.bubble .message-content :global(strong) {
					font-weight: 950;
					color: #0b765d;
				}

				:global(.message-label) {
					display: inline;
					padding-inline-end: 2px;
				}

				.bubble.guest :global(.message-label),
				.bubble.guest .message-content :global(strong) {
					color: #ffffff;
				}

				.bubble .message-content :global(a) {
					display: inline-flex;
					align-items: center;
					gap: 6px;
					max-width: 100%;
					min-height: 28px;
					margin: 3px 2px;
					padding: 4px 9px;
					border: 1px solid rgba(29, 114, 232, 0.24);
					border-radius: 999px;
					color: #075dbf;
					background:
						linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(235, 245, 255, 0.92)),
						#eef7ff;
					font-weight: 950;
					text-decoration: none;
					overflow-wrap: anywhere;
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.9),
						0 5px 12px rgba(29, 114, 232, 0.11);
					vertical-align: middle;
				}

				.bubble .message-content :global(a)::after {
					content: "";
					width: 7px;
					height: 7px;
					flex: 0 0 auto;
					border-top: 2px solid currentColor;
					border-right: 2px solid currentColor;
					transform: rotate(45deg);
				}

				.bubble .message-content :global(a:hover),
				.bubble .message-content :global(a:focus-visible) {
					color: #004b9b;
					border-color: rgba(29, 114, 232, 0.42);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.95),
						0 0 0 3px rgba(29, 114, 232, 0.11),
						0 7px 16px rgba(29, 114, 232, 0.15);
				}

				.bubble.guest .message-content :global(a) {
					color: #e9fbff;
					border-color: rgba(143, 234, 255, 0.34);
					background:
						linear-gradient(180deg, rgba(143, 234, 255, 0.2), rgba(255, 255, 255, 0.08)),
						rgba(255, 255, 255, 0.1);
					box-shadow:
						inset 0 1px rgba(255, 255, 255, 0.2),
						0 5px 12px rgba(0, 0, 0, 0.12);
				}

				.quick-replies {
					display: flex;
					flex-wrap: wrap;
					gap: 8px;
					margin-top: 11px;
				}

				.quick-reply {
					min-height: 36px;
					border: 1px solid rgba(11, 143, 106, 0.26);
					border-radius: 8px;
					padding: 0 12px;
					color: var(--zad-blue);
					background:
						linear-gradient(180deg, #ffffff 0%, #f3faf8 100%),
						#fff;
					font-size: 13px;
					font-weight: 950;
					cursor: pointer;
					line-height: 1.2;
					white-space: normal;
					transition:
						transform 150ms ease,
						border-color 150ms ease,
						box-shadow 150ms ease,
						background 150ms ease;
				}

				.quick-reply:hover,
				.quick-reply:focus-visible {
					transform: translateY(-1px);
					border-color: rgba(11, 143, 106, 0.46);
					box-shadow: 0 8px 18px rgba(11, 143, 106, 0.14);
				}

				.quick-reply-tray {
					flex: 0 0 auto;
					display: flex;
					flex-wrap: wrap;
					gap: 8px;
					padding: 11px 12px;
					border-top: 1px solid var(--zad-border);
					background:
						linear-gradient(180deg, rgba(248, 252, 255, 0.98), rgba(241, 249, 247, 0.98)),
						#f8fbff;
					box-shadow: 0 -10px 22px rgba(12, 35, 58, 0.07);
				}

				.quick-reply.tray-action {
					flex: 1 1 136px;
					min-height: 40px;
					border-color: rgba(11, 143, 106, 0.38);
					background:
						linear-gradient(180deg, #ffffff 0%, #ecfaf5 100%),
						#fff;
					box-shadow: 0 8px 18px rgba(11, 143, 106, 0.1);
				}

				.quick-reply:disabled {
					cursor: wait;
					opacity: 0.62;
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
					flex: 0 0 auto;
					display: grid;
					grid-template-columns: 44px minmax(0, 1fr) 44px;
					align-items: end;
					gap: 8px;
					padding: 12px;
					border-top: 1px solid var(--zad-border);
					background: #fff;
					position: relative;
				}

				.reply-form textarea {
					border: 1px solid rgba(36, 84, 125, 0.18);
					border-radius: 8px;
					width: 100%;
					min-height: 44px;
					max-height: 128px;
					padding: 11px 12px;
					line-height: 20px;
					outline: none;
					resize: none;
					overflow-y: auto;
					white-space: pre-wrap;
					overflow-wrap: anywhere;
					word-break: break-word;
					font: inherit;
					scrollbar-width: thin;
				}

				.reply-form textarea:focus {
					border-color: rgba(11, 143, 106, 0.52);
					box-shadow: 0 0 0 3px rgba(11, 143, 106, 0.11);
				}

				.emoji-toggle,
				.send-reply {
					border: 0;
					border-radius: 8px;
					color: #fff;
					background: var(--zad-green);
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 44px;
					height: 44px;
					cursor: pointer;
				}

				.emoji-toggle {
					color: var(--zad-blue);
					background:
						linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 248, 252, 0.96)),
						#fff;
					border: 1px solid rgba(36, 84, 125, 0.16);
				}

				.send-reply:disabled {
					opacity: 0.48;
					cursor: default;
				}

				.emoji-popover {
					position: absolute;
					left: 12px;
					bottom: 64px;
					z-index: 2;
					display: grid;
					grid-template-columns: repeat(4, 38px);
					gap: 7px;
					padding: 9px;
					border-radius: 8px;
					border: 1px solid rgba(36, 84, 125, 0.14);
					background: #fff;
					box-shadow: 0 14px 34px rgba(8, 9, 13, 0.16);
				}

				.emoji-choice {
					width: 38px;
					height: 38px;
					border: 1px solid rgba(36, 84, 125, 0.12);
					border-radius: 8px;
					background: #f8fafc;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					font-size: 19px;
					cursor: pointer;
				}

				.error {
					margin: 0;
					padding: 0 14px 14px;
					color: #b42318;
					font-weight: 800;
					font-size: 13px;
				}

				.notice {
					flex: 0 0 auto;
					margin: 0;
					padding: 12px 16px;
					color: #05603a;
					background: rgba(55, 212, 156, 0.1);
					border-bottom: 1px solid rgba(11, 143, 106, 0.14);
					font-size: 13px;
					font-weight: 900;
					line-height: 1.45;
				}

				.rating-panel {
					flex: 1 1 auto;
					min-height: 0;
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 24px;
					background:
						radial-gradient(circle at 50% 0%, rgba(55, 212, 156, 0.16), transparent 38%),
						linear-gradient(180deg, #f7fbfb 0%, #f7f8fb 100%);
					overflow-y: auto;
					overscroll-behavior: contain;
				}

				.rating-card {
					width: 100%;
					max-width: 334px;
					display: grid;
					justify-items: center;
					gap: 14px;
					padding: 24px 20px 22px;
					border-radius: 8px;
					border: 1px solid rgba(36, 84, 125, 0.14);
					background:
						linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 253, 252, 0.98)),
						#fff;
					box-shadow: 0 18px 42px rgba(15, 20, 35, 0.12);
					text-align: center;
				}

				.rating-mark {
					width: 58px;
					height: 58px;
					border-radius: 50%;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					color: #fff;
					background: linear-gradient(135deg, var(--zad-blue), var(--zad-green));
					box-shadow: 0 12px 24px rgba(11, 143, 106, 0.22);
				}

				.rating-copy {
					display: grid;
					gap: 7px;
					justify-items: center;
				}

				.rating-copy strong {
					color: var(--zad-blue);
					font-size: 18px;
					line-height: 1.25;
				}

				.rating-copy p {
					margin: 0;
					color: #516174;
					font-size: 13px;
					font-weight: 800;
					line-height: 1.45;
				}

				.rating-stars,
				.rating-actions {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 9px;
				}

				.rating-star {
					width: 44px;
					height: 44px;
					border-radius: 8px;
					border: 1px solid rgba(245, 166, 35, 0.28);
					color: #b77900;
					background: #fff;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					cursor: pointer;
					transition:
						transform 150ms ease,
						border-color 150ms ease,
						background 150ms ease,
						box-shadow 150ms ease;
				}

				.rating-star svg {
					fill: transparent;
					stroke-width: 2.25;
				}

				.rating-star:hover,
				.rating-star:focus-visible {
					transform: translateY(-1px);
					border-color: rgba(245, 166, 35, 0.54);
					box-shadow: 0 8px 18px rgba(245, 166, 35, 0.14);
				}

				.rating-star.is-active {
					color: #f5a623;
					background: #fff7df;
					border-color: rgba(245, 166, 35, 0.48);
				}

				.rating-star.is-active svg {
					fill: currentColor;
				}

				.rating-actions {
					width: 100%;
					display: grid;
					grid-template-columns: repeat(2, minmax(0, 1fr));
					margin-top: 3px;
				}

				.rating-submit,
				.rating-skip {
					width: 100%;
					min-height: 42px;
					border-radius: 8px;
					padding: 0 12px;
					font-size: 12px;
					font-weight: 950;
					cursor: pointer;
					white-space: normal;
					line-height: 1.2;
				}

				.rating-submit {
					border: 0;
					color: #fff;
					background: var(--zad-green);
				}

				.rating-skip {
					border: 1px solid rgba(36, 84, 125, 0.16);
					color: var(--zad-blue);
					background: #fff;
				}

				.rating-submit:disabled,
				.rating-skip:disabled {
					opacity: 0.62;
					cursor: default;
				}

				@media (max-width: 640px) {
					.support-root {
						right: 14px;
						bottom: 14px;
					}

					.support-root.is-open .support-button {
						display: none;
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
						top: var(--support-visual-top, 0);
						left: var(--support-visual-left, 0);
						right: auto;
						bottom: auto;
						width: var(--support-visual-width, 100vw);
						height: var(--support-visual-height, 100dvh);
						max-height: var(--support-visual-height, 100dvh);
						border: 0;
						border-radius: 0;
						box-shadow: none;
					}

					.start-form,
					.messages {
						padding: 14px;
					}

					.support-head {
						min-height: 74px;
						padding: calc(10px + env(safe-area-inset-top)) 14px 12px;
						gap: 10px;
					}

					.support-head-actions {
						gap: 16px;
					}

					.support-end-chat {
						min-height: 38px;
						padding: 0 12px;
					}

					.support-end-chat span {
						max-width: 86px;
						overflow: hidden;
						text-overflow: ellipsis;
						white-space: nowrap;
					}

					.support-close {
						width: 46px;
						height: 46px;
						border-radius: 14px;
						flex: 0 0 auto;
					}

					.bubble {
						max-width: 92%;
					}

					.quick-reply-tray {
						padding: 9px 10px;
						gap: 7px;
					}

					.quick-reply.tray-action {
						flex: 1 1 calc(50% - 7px);
						min-width: 0;
						min-height: 42px;
					}

					.reply-form {
						grid-template-columns: 40px minmax(0, 1fr) 44px;
						gap: 6px;
						padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
					}

					.emoji-toggle {
						width: 40px;
						height: 44px;
					}

					.emoji-popover {
						left: 10px;
						right: 10px;
						bottom: 60px;
						grid-template-columns: repeat(4, minmax(0, 1fr));
					}

					.emoji-choice {
						width: 100%;
					}

					.rating-panel {
						padding: 16px 14px;
					}

					.rating-card {
						gap: 12px;
						padding: 20px 16px;
					}

					.rating-mark {
						width: 52px;
						height: 52px;
					}

					.rating-star {
						width: 40px;
						height: 40px;
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

				@media (max-height: 760px) and (min-width: 641px) {
					.support-root {
						right: 14px;
						bottom: 12px;
					}

					.support-panel {
						position: fixed;
						top: max(10px, env(safe-area-inset-top));
						right: 14px;
						bottom: 70px;
						width: min(410px, calc(100vw - 28px));
						max-height: none;
					}

					.support-head {
						padding: 12px 14px;
					}

					.start-form,
					.messages {
						padding: 12px;
					}

					.start-form {
						gap: 10px;
					}

					.support-field input,
					.support-field select,
					.support-language-select {
						min-height: 42px;
					}

					.support-field textarea {
						min-height: 68px;
						max-height: 120px;
					}

					.messages {
						min-height: 160px;
					}
				}

				@media (max-height: 760px) and (max-width: 640px) {
					.support-panel {
						top: var(--support-visual-top, 0);
						left: var(--support-visual-left, 0);
						right: auto;
						bottom: auto;
						width: var(--support-visual-width, 100vw);
						height: var(--support-visual-height, 100dvh);
						max-height: var(--support-visual-height, 100dvh);
					}

					.support-head {
						padding: calc(10px + env(safe-area-inset-top)) 14px 12px;
					}

					.start-form,
					.messages {
						padding: 12px;
					}

					.support-field textarea {
						min-height: 68px;
						max-height: 120px;
					}
				}
			`}</style>
		</div>
	);
}
