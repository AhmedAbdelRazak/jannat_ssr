"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	BedDouble,
	CheckCircle2,
	MessageCircle,
	ShieldCheck,
	Sparkles,
	Star,
	UserRound,
} from "lucide-react";
import {
	getHotelReviewsPageBySlug,
	resolveHotelReviewInvitation,
	submitHotelReview,
} from "../lib/api";
import { WHATSAPP_NUMBER } from "../lib/constants";
import { titleCase } from "../lib/format";
import {
	HOTEL_REVIEW_PAGE_SIZE,
	normalizeHotelReview,
	normalizeHotelReviewPage,
	normalizeHotelReviewSummary,
} from "../lib/hotelReviews";
import { sanitizeSensitiveUrl } from "../lib/urlPrivacy";
import PaginationControls from "./PaginationControls";
import { useJannatApp } from "./JannatAppProvider";

const cleanText = (value, maxLength = 2000) =>
	String(value || "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, maxLength);

const normalizedSlug = (value = "") => {
	let decoded = String(value || "");
	try {
		decoded = decodeURIComponent(decoded);
	} catch (_error) {
		// Keep the original value if a malformed external link cannot be decoded.
	}
	return decoded.trim().toLowerCase().replace(/[_\s]+/g, "-").replace(/-+/g, "-");
};

const splitGuestName = (value = "") => {
	const parts = cleanText(value, 160).split(" ").filter(Boolean);
	return {
		firstName: parts[0] || "",
		lastName: parts.slice(1).join(" "),
	};
};

const boundedRating = (value) => {
	const rating = Number(value);
	return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0;
};

const privateReviewValuesFromHash = (hash = "") => {
	const rawHash = String(hash || "").replace(/^#/, "");
	const questionIndex = rawHash.indexOf("?");
	const hasBareParams = questionIndex < 0 && rawHash.includes("=");
	if (questionIndex < 0 && !hasBareParams) {
		return { reviewToken: "", confirmationNumber: "" };
	}
	const query = questionIndex >= 0 ? rawHash.slice(questionIndex + 1) : rawHash;
	const params = new URLSearchParams(query);
	return {
		reviewToken:
			params.get("reviewToken") ||
			params.get("reviewtoken") ||
			params.get("review_token") ||
			"",
		confirmationNumber:
			params.get("confirmationNumber") ||
			params.get("confirmationumber") ||
			params.get("confirmation_number") ||
			params.get("confirmation") ||
			"",
	};
};

const formatReviewDate = (value, isArabic) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	}).format(date);
};

const reviewCopy = (isArabic, hotelName) =>
	isArabic
		? {
			eyebrow: "\u0622\u0631\u0627\u0621 \u0627\u0644\u0636\u064a\u0648\u0641",
			title: `\u0634\u0627\u0631\u0643 \u062a\u062c\u0631\u0628\u062a\u0643 \u0641\u064a ${hotelName}`,
			intro:
				"\u062a\u0642\u064a\u064a\u0645\u0643 \u064a\u0633\u0627\u0639\u062f \u0627\u0644\u0636\u064a\u0648\u0641 \u0627\u0644\u0642\u0627\u062f\u0645\u064a\u0646 \u0648\u064a\u0633\u0627\u0639\u062f\u0646\u0627 \u0639\u0644\u0649 \u0627\u0644\u062a\u062d\u0633\u0646.",
			guestRating: "\u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0636\u064a\u0648\u0641",
			basedOn: "\u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649",
			ratingSingular: "\u062a\u0642\u064a\u064a\u0645",
			ratingPlural: "\u062a\u0642\u064a\u064a\u0645\u0627\u062a",
			firstRating: "\u0643\u0646 \u0623\u0648\u0644 \u0645\u0646 \u064a\u0642\u064a\u0651\u0645 \u0625\u0642\u0627\u0645\u062a\u0647 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0641\u0646\u062f\u0642.",
			ratingsUnavailable: "\u062a\u0642\u064a\u064a\u0645\u0627\u062a \u0627\u0644\u0636\u064a\u0648\u0641 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629 \u0645\u0624\u0642\u062a\u064b\u0627. \u064a\u0645\u0643\u0646\u0643 \u0645\u0639 \u0630\u0644\u0643 \u0645\u0634\u0627\u0631\u0643\u0629 \u062a\u0642\u064a\u064a\u0645\u0643.",
			formTitle: "\u0642\u064a\u0651\u0645 \u0625\u0642\u0627\u0645\u062a\u0643",
			ratingLabel: "\u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u0645\u0646 5 \u0646\u062c\u0648\u0645",
			firstName: "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644",
			lastName: "\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629",
			comment: "\u062a\u0639\u0644\u064a\u0642 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)",
			commentPlaceholder: "\u0645\u0627 \u0627\u0644\u0630\u064a \u0623\u0639\u062c\u0628\u0643\u061f \u0648\u0645\u0627 \u0627\u0644\u0630\u064a \u064a\u0645\u0643\u0646\u0646\u0627 \u062a\u062d\u0633\u064a\u0646\u0647\u061f",
			confirmation: "\u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)",
			confirmationHelp:
				"\u064a\u0633\u0627\u0639\u062f\u0646\u0627 \u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f \u0639\u0644\u0649 \u0641\u0647\u0645 \u062a\u0641\u0627\u0635\u064a\u0644 \u0625\u0642\u0627\u0645\u062a\u0643. \u0644\u0646 \u064a\u0638\u0647\u0631 \u0644\u0644\u0639\u0627\u0645\u0629.",
			privacyNote:
				"\u0642\u062f \u0646\u0646\u0634\u0631 \u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u0648\u0627\u0644\u062a\u0639\u0644\u064a\u0642 \u0645\u0639 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644 \u0648\u0627\u0644\u062d\u0631\u0641 \u0627\u0644\u0623\u0648\u0644 \u0645\u0646 \u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629. \u064a\u0628\u0642\u0649 \u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f \u0648\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u063a\u0631\u0641\u0629 \u062e\u0627\u0635\u0629.",
			checking: "\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0625\u0642\u0627\u0645\u0629...",
			reservationFound: "\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0625\u0642\u0627\u0645\u0629",
			signedInAs: "\u0633\u062a\u0646\u0634\u0631 \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0628\u0627\u0633\u0645",
			submit: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062a\u0642\u064a\u064a\u0645",
			submitting: "\u062c\u0627\u0631\u064d \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062a\u0642\u064a\u064a\u0645...",
			chooseRating: "\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u062a\u0642\u064a\u064a\u0645 \u0645\u0646 1 \u0625\u0644\u0649 5 \u0646\u062c\u0648\u0645.",
			nameRequired: "\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644 \u0648\u0627\u0633\u0645 \u0627\u0644\u0639\u0627\u0626\u0644\u0629.",
			recent: "\u0623\u062d\u062f\u062b \u0645\u0631\u0627\u062c\u0639\u0627\u062a \u0627\u0644\u0636\u064a\u0648\u0641",
			reviewSingular: "\u0645\u0631\u0627\u062c\u0639\u0629",
			reviewPlural: "\u0645\u0631\u0627\u062c\u0639\u0627\u062a",
			ratingOnly: "\u062a\u0642\u064a\u064a\u0645 \u0628\u062f\u0648\u0646 \u062a\u0639\u0644\u064a\u0642.",
			verified: "\u0625\u0642\u0627\u0645\u0629 \u0645\u0624\u0643\u062f\u0629",
			loadError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629 \u0645\u0646 \u0627\u0644\u062a\u0642\u064a\u064a\u0645\u0627\u062a. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.",
			lookupError: "\u0631\u0627\u0628\u0637 \u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d \u0623\u0648 \u0627\u0646\u062a\u0647\u062a \u0635\u0644\u0627\u062d\u064a\u062a\u0647. \u064a\u0645\u0643\u0646\u0643 \u0645\u062a\u0627\u0628\u0639\u0629 \u0625\u0631\u0633\u0627\u0644 \u062a\u0642\u064a\u064a\u0645\u0643 \u064a\u062f\u0648\u064a\u064b\u0627.",
			wrongHotel: "\u0631\u0642\u0645 \u0627\u0644\u062a\u0623\u0643\u064a\u062f \u0647\u0630\u0627 \u0645\u0631\u062a\u0628\u0637 \u0628\u0641\u0646\u062f\u0642 \u0622\u062e\u0631.",
			fiveThanks: "\u0634\u0643\u0631\u064b\u0627 \u0644\u0645\u0634\u0627\u0631\u0643\u062a\u0646\u0627 \u062a\u062c\u0631\u0628\u062a\u0643 \u0627\u0644\u0631\u0627\u0626\u0639\u0629. \u0646\u062a\u0645\u0646\u0649 \u0644\u0643 \u0631\u062d\u0644\u0627\u062a \u0633\u0639\u064a\u062f\u0629 \u0648\u0622\u0645\u0646\u0629\u060c \u0648\u0633\u0646\u0648\u0627\u0635\u0644 \u0627\u0644\u062a\u062d\u0633\u0646.",
			fourThanks: "\u0634\u0643\u0631\u064b\u0627 \u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a\u0643. \u0646\u062a\u0645\u0646\u0649 \u0644\u0643 \u0631\u062d\u0644\u0627\u062a \u0633\u0639\u064a\u062f\u0629\u060c \u0648\u0633\u0646\u0648\u0627\u0635\u0644 \u0627\u0644\u062a\u062d\u0633\u0646.",
			threeThanks: "\u0634\u0643\u0631\u064b\u0627 \u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a\u0643. \u0633\u0646\u0648\u0627\u0635\u0644 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0639 \u0648\u0627\u0644\u062a\u062d\u0633\u0646.",
			lowThanks: "\u0646\u0639\u062a\u0630\u0631 \u0644\u0623\u0646 \u062a\u062c\u0631\u0628\u062a\u0643 \u0644\u0645 \u062a\u0643\u0646 \u0628\u0627\u0644\u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u0645\u0623\u0645\u0648\u0644. \u0646\u062d\u0646 \u0647\u0646\u0627 \u0644\u0644\u0627\u0633\u062a\u0645\u0627\u0639 \u0648\u0627\u0644\u0645\u0633\u0627\u0639\u062f\u0629 \u0648\u0633\u0646\u0648\u0627\u0635\u0644 \u0627\u0644\u062a\u062d\u0633\u0646.",
			whatsapp: "\u062a\u062d\u062f\u062b \u0645\u0639\u0646\u0627 \u0639\u0628\u0631 WhatsApp",
		}
		: {
			eyebrow: "Guest reviews",
			title: `Share your stay at ${hotelName}`,
			intro: "Your rating helps future guests and helps us keep improving.",
			guestRating: "Guest rating",
			basedOn: "Based on",
			ratingSingular: "rating",
			ratingPlural: "ratings",
			firstRating: "Be the first guest to rate a stay at this hotel.",
			ratingsUnavailable:
				"Guest ratings are temporarily unavailable. You can still share your rating.",
			formTitle: "Rate your stay",
			ratingLabel: "Rating out of 5 stars",
			firstName: "First name",
			lastName: "Last name",
			comment: "Comment (optional)",
			commentPlaceholder: "What went well, and what could we improve?",
			confirmation: "Confirmation number (optional)",
			confirmationHelp:
				"A confirmation number helps our team understand your stay details. It is never shown publicly.",
			privacyNote:
				"Your rating and comment may be published with your first name and last initial. Confirmation and room details stay private.",
			checking: "Checking your stay details...",
			reservationFound: "Stay details found",
			signedInAs: "Your review will be shared as",
			submit: "Submit rating",
			submitting: "Submitting rating...",
			chooseRating: "Please choose a rating from 1 to 5 stars.",
			nameRequired: "Please enter your first and last names.",
			recent: "Recent guest reviews",
			reviewSingular: "review",
			reviewPlural: "reviews",
			ratingOnly: "Rating shared without a comment.",
			verified: "Verified stay",
			loadError: "We could not load this page of ratings. Please try again.",
			lookupError:
				"This review link is invalid or has expired. You can still submit your rating manually.",
			wrongHotel: "That confirmation number belongs to a different hotel.",
			fiveThanks:
				"Thank you for sharing your wonderful experience. We wish you safe, joyful travels, and we’ll keep getting better.",
			fourThanks:
				"Thank you for your feedback. We wish you happy travels, and we’ll keep getting better.",
			threeThanks: "Thank you for your feedback. We’ll keep listening and getting better.",
			lowThanks:
				"We’re sorry your experience fell short. We’re here to listen, help, and keep getting better.",
			whatsapp: "Tell us more on WhatsApp",
		};

const StaticStars = ({ rating, label }) => (
	<div className="hotel-review-static-stars" role="img" aria-label={label}>
		{[1, 2, 3, 4, 5].map((value) => (
			<Star key={value} size={17} fill={value <= Math.round(Number(rating) || 0) ? "currentColor" : "none"} />
		))}
	</div>
);

export default function HotelReviews({
	hotel = {},
	hotelSlug = "",
	website = {},
	initialData = {},
	summary = {},
	onSummaryChange,
}) {
	const { auth, isSignedIn, isArabic } = useJannatApp();
	const hotelName =
		(isArabic && hotel.hotelName_OtherLanguage) || titleCase(hotel.hotelName || "hotel");
	const copy = useMemo(() => reviewCopy(isArabic, hotelName), [hotelName, isArabic]);
	const normalizedInitial = useMemo(
		() => normalizeHotelReviewPage(initialData, HOTEL_REVIEW_PAGE_SIZE),
		[initialData]
	);
	const normalizedSummary = normalizeHotelReviewSummary(summary);
	const [reviews, setReviews] = useState(() => normalizedInitial.reviews);
	const [pagination, setPagination] = useState(() => normalizedInitial.pagination);
	const [reviewsAvailable, setReviewsAvailable] = useState(() => normalizedInitial.available);
	const [form, setForm] = useState({
		rating: 0,
		firstName: "",
		lastName: "",
		comment: "",
		confirmationNumber: "",
	});
	const [reviewToken, setReviewToken] = useState("");
	const [roomLabel, setRoomLabel] = useState("");
	const [invitationLocked, setInvitationLocked] = useState(false);
	const [prefillState, setPrefillState] = useState({ status: "idle", message: "" });
	const [submitting, setSubmitting] = useState(false);
	const [submittedRating, setSubmittedRating] = useState(0);
	const [submitError, setSubmitError] = useState("");
	const [reviewsLoading, setReviewsLoading] = useState(false);
	const [reviewsError, setReviewsError] = useState("");
	const [celebrating, setCelebrating] = useState(false);
	const formHeadingRef = useRef(null);
	const successRef = useRef(null);
	const reviewsHeadingRef = useRef(null);
	const pageRequestRef = useRef(0);
	const deepLinkHandledRef = useRef("");
	const deepLinkRequestRef = useRef(0);
	const privateReviewLinkRef = useRef(null);
	const initialRetryRef = useRef({ key: "", promise: null });
	const copyRef = useRef(copy);
	copyRef.current = copy;

	useEffect(() => {
		setReviews(normalizedInitial.reviews);
		setPagination(normalizedInitial.pagination);
		setReviewsAvailable(normalizedInitial.available);
		if (normalizedInitial.available) return;

		const retryKey = String(hotelSlug || hotel?._id || "hotel");
		if (initialRetryRef.current.key !== retryKey || !initialRetryRef.current.promise) {
			initialRetryRef.current = {
				key: retryKey,
				promise: getHotelReviewsPageBySlug(hotelSlug, {
					page: 1,
					limit: HOTEL_REVIEW_PAGE_SIZE,
				}),
			};
		}
		const requestId = pageRequestRef.current + 1;
		pageRequestRef.current = requestId;
		setReviewsLoading(true);
		setReviewsError("");
		initialRetryRef.current.promise
			.then((payload) => {
				if (pageRequestRef.current !== requestId) return;
				const nextData = normalizeHotelReviewPage(payload, HOTEL_REVIEW_PAGE_SIZE);
				setReviews(nextData.reviews);
				setPagination(nextData.pagination);
				setReviewsAvailable(true);
				onSummaryChange?.(nextData.summary);
			})
			.catch(() => {
				if (pageRequestRef.current === requestId) {
					setReviewsError(copyRef.current.loadError);
				}
			})
			.finally(() => {
				if (pageRequestRef.current === requestId) setReviewsLoading(false);
			});
	}, [hotelSlug, normalizedInitial]);

	useEffect(() => {
		if (!celebrating) return undefined;
		const timeout = window.setTimeout(() => setCelebrating(false), 4200);
		return () => window.clearTimeout(timeout);
	}, [celebrating]);

	const applyPrefill = useCallback((prefill = {}) => {
		setForm((current) => ({
			...current,
			firstName: current.firstName || cleanText(prefill.firstName, 80),
			lastName: current.lastName || cleanText(prefill.lastName, 80),
			confirmationNumber:
				cleanText(prefill.confirmationNumber, 120) || current.confirmationNumber,
		}));
		setRoomLabel(cleanText(prefill.roomLabel, 180));
	}, []);

	const clearInvitationPrefill = useCallback((sourceConfirmation = "") => {
		const normalizedSource = cleanText(sourceConfirmation, 120);
		setForm((current) => {
			if (!normalizedSource || cleanText(current.confirmationNumber, 120) !== normalizedSource) {
				return current;
			}
			return { ...current, confirmationNumber: "" };
		});
		setRoomLabel("");
		setInvitationLocked(false);
	}, []);

	useEffect(() => {
		const linkCopy = copyRef.current;
		const params = new URLSearchParams(window.location.search || "");
		const hashValues = privateReviewValuesFromHash(window.location.hash);
		if (!privateReviewLinkRef.current) {
			privateReviewLinkRef.current = {
				confirmationNumber:
					params.get("confirmationNumber") ||
					params.get("confirmationumber") ||
					params.get("confirmation_number") ||
					params.get("confirmation") ||
					hashValues.confirmationNumber ||
					window.__JANNAT_PRIVATE_REVIEW_LINK__?.confirmationNumber ||
					"",
				reviewToken:
					params.get("reviewToken") ||
					params.get("reviewtoken") ||
					params.get("review_token") ||
					hashValues.reviewToken ||
					window.__JANNAT_PRIVATE_REVIEW_LINK__?.reviewToken ||
					"",
			};
		}
		const privateLink = privateReviewLinkRef.current;
		const confirmationNumber = cleanText(
			privateLink.confirmationNumber,
			120
		);
		const token = cleanText(privateLink.reviewToken, 500);
		try {
			delete window.__JANNAT_PRIVATE_REVIEW_LINK__;
		} catch (_error) {
			// The temporary handoff is configurable, but failure must not block the form.
		}
		const sanitizedHref = sanitizeSensitiveUrl(window.location.href);
		if (sanitizedHref && sanitizedHref !== window.location.href) {
			const sanitizedUrl = new URL(sanitizedHref);
			window.history.replaceState(
				window.history.state,
				"",
				`${sanitizedUrl.pathname}${sanitizedUrl.search}${sanitizedUrl.hash}`
			);
		}
		const linkedRating = boundedRating(params.get("rating"));
		const reviewFlag = String(params.get("review") || "").toLowerCase();
		const shouldFocus =
			["1", "true", "yes"].includes(reviewFlag) ||
			Boolean(confirmationNumber || token || linkedRating);
		const deepLinkKey = [hotelSlug, confirmationNumber, token, linkedRating, reviewFlag].join("|");
		if (!shouldFocus && !token) return undefined;
		const scheduleFocus = () =>
			shouldFocus
				? window.setTimeout(() => {
						const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
						document.getElementById("reviews")?.scrollIntoView({
							behavior: reduceMotion ? "auto" : "smooth",
							block: "start",
						});
						formHeadingRef.current?.focus({ preventScroll: true });
					  }, 220)
				: null;
		if (deepLinkHandledRef.current === deepLinkKey) {
			const retryFocusTimer = scheduleFocus();
			return () => {
				if (retryFocusTimer) window.clearTimeout(retryFocusTimer);
			};
		}
		deepLinkHandledRef.current = deepLinkKey;
		const requestId = deepLinkRequestRef.current + 1;
		deepLinkRequestRef.current = requestId;

		setReviewToken(token);
		setInvitationLocked(Boolean(token));
		setForm((current) => ({
			...current,
			rating: linkedRating || current.rating,
			confirmationNumber: confirmationNumber || current.confirmationNumber,
		}));

		const focusTimer = scheduleFocus();

		const loadLinkedPrefill = async () => {
			if (token) {
				setPrefillState({ status: "loading", message: linkCopy.checking });
				try {
					const response = await resolveHotelReviewInvitation(token);
					if (deepLinkRequestRef.current !== requestId) return;
					const prefill = response?.prefill || {};
					if (!response?.success || !prefill.confirmationNumber) {
						throw new Error("Invitation not found");
					}
					if (
						prefill.hotelSlug &&
						normalizedSlug(prefill.hotelSlug) !== normalizedSlug(hotelSlug)
					) {
						setReviewToken("");
						clearInvitationPrefill(confirmationNumber);
						setPrefillState({ status: "error", message: linkCopy.wrongHotel });
						return;
					}
					applyPrefill(prefill);
					setInvitationLocked(true);
					setPrefillState({
						status: "success",
						message: prefill.roomLabel
							? `${linkCopy.reservationFound}: ${cleanText(prefill.roomLabel, 180)}`
							: linkCopy.reservationFound,
					});
				} catch (_error) {
					if (deepLinkRequestRef.current === requestId) {
						setReviewToken("");
						clearInvitationPrefill(confirmationNumber);
						setPrefillState({ status: "error", message: linkCopy.lookupError });
					}
				}
				return;
			}
		};

		loadLinkedPrefill();
		return () => {
			if (focusTimer) window.clearTimeout(focusTimer);
		};
	}, [applyPrefill, clearInvitationPrefill, hotelSlug]);

	useEffect(
		() => () => {
			pageRequestRef.current += 1;
		},
		[]
	);

	const updateForm = (key, value) => {
		setForm((current) => ({ ...current, [key]: value }));
		if (key === "confirmationNumber") {
			setRoomLabel("");
			setPrefillState({ status: "idle", message: "" });
		}
	};

	const signedInName =
		cleanText(auth?.user?.name || auth?.user?.email || "", 160) ||
		(isArabic ? "\u0636\u064a\u0641" : "Guest");
	const signedInNames = splitGuestName(auth?.user?.name || "");
	const whatsappNumber = String(website?.whatsappNumber || WHATSAPP_NUMBER).replace(/\D/g, "");
	const whatsappMessage = isArabic
		? `\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645\u060c \u0623\u0631\u063a\u0628 \u0641\u064a \u0627\u0644\u062d\u062f\u064a\u062b \u0639\u0646 \u062a\u062c\u0631\u0628\u062a\u064a \u0641\u064a ${hotelName}.`
		: `Assalamu alaikum, I would like to share more about my experience at ${hotelName}.`;
	const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

	const successMessage =
		submittedRating === 5
			? copy.fiveThanks
			: submittedRating === 4
				? copy.fourThanks
				: submittedRating === 3
					? copy.threeThanks
					: copy.lowThanks;

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (submitting || submittedRating) return;
		setSubmitError("");
		const rating = boundedRating(form.rating);
		if (!rating) {
			setSubmitError(copy.chooseRating);
			return;
		}
		if (!isSignedIn && (!cleanText(form.firstName, 80) || !cleanText(form.lastName, 80))) {
			setSubmitError(copy.nameRequired);
			return;
		}

		setSubmitting(true);
		pageRequestRef.current += 1;
		setReviewsLoading(false);
		try {
			const response = await submitHotelReview(
				hotelSlug,
				{
					rating,
					comment: cleanText(form.comment, 2000),
					firstName: isSignedIn ? signedInNames.firstName : cleanText(form.firstName, 80),
					lastName: isSignedIn ? signedInNames.lastName : cleanText(form.lastName, 80),
					confirmationNumber: cleanText(form.confirmationNumber, 120),
					reviewToken,
					website: "",
					language: isArabic ? "ar" : "en",
				},
				auth?.token || ""
			);
			if (!response?.success || !response?.summary) {
				throw new Error(response?.message || "Unable to submit rating");
			}
			const nextSummary = normalizeHotelReviewSummary(response.summary);
			onSummaryChange?.(nextSummary);
			setReviewsAvailable(true);
			const priorPage = pagination.page;
			const submittedReview = normalizeHotelReview(response.review);
			if (submittedReview?._id) {
				setReviews((current) =>
					[
						submittedReview,
						...(priorPage === 1
							? current.filter((review) => review?._id !== submittedReview._id)
							: []),
					].slice(0, HOTEL_REVIEW_PAGE_SIZE)
				);
			} else if (priorPage !== 1) {
				setReviews([]);
			}
			setPagination((current) => {
				const totalItems = Math.max(
					Number(current.totalItems || 0) + (submittedReview?._id ? 1 : 0),
					nextSummary.ratingCount
				);
				return {
					...current,
					page: 1,
					totalItems,
					totalPages: Math.max(
						1,
						Math.ceil(totalItems / HOTEL_REVIEW_PAGE_SIZE)
					),
					hasNextPage: totalItems > HOTEL_REVIEW_PAGE_SIZE,
				};
			});
			setSubmittedRating(rating);
			setForm((current) => ({ ...current, comment: "" }));
			if (rating >= 4) setCelebrating(true);
			window.requestAnimationFrame(() => successRef.current?.focus());

			const refreshRequestId = pageRequestRef.current + 1;
			pageRequestRef.current = refreshRequestId;
			setReviewsLoading(true);
			getHotelReviewsPageBySlug(hotelSlug, {
				page: 1,
				limit: HOTEL_REVIEW_PAGE_SIZE,
			})
				.then((payload) => {
					if (pageRequestRef.current !== refreshRequestId) return;
					const nextData = normalizeHotelReviewPage(payload, HOTEL_REVIEW_PAGE_SIZE);
					setReviews(nextData.reviews);
					setPagination(nextData.pagination);
					setReviewsAvailable(true);
					onSummaryChange?.(nextData.summary);
				})
				.catch(() => {
					// Keep the just-submitted review and summary if the background refresh fails.
				})
				.finally(() => {
					if (pageRequestRef.current === refreshRequestId) setReviewsLoading(false);
				});
		} catch (error) {
			setSubmitError(
				error?.message ||
					(isArabic
						? "\u062a\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062a\u0642\u064a\u064a\u0645. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649."
						: "We could not submit your rating. Please try again.")
			);
		} finally {
			setSubmitting(false);
		}
	};

	const loadReviewsPage = async (targetPage) => {
		const page = Math.max(1, Number(targetPage) || 1);
		if (reviewsLoading || page === pagination.page) return;
		const requestId = pageRequestRef.current + 1;
		pageRequestRef.current = requestId;
		setReviewsLoading(true);
		setReviewsError("");
		try {
			const payload = await getHotelReviewsPageBySlug(hotelSlug, {
				page,
				limit: HOTEL_REVIEW_PAGE_SIZE,
			});
			if (pageRequestRef.current !== requestId) return;
			if (!payload) throw new Error("Ratings unavailable");
			const nextData = normalizeHotelReviewPage(payload, HOTEL_REVIEW_PAGE_SIZE);
			setReviews(nextData.reviews);
			setPagination(nextData.pagination);
			setReviewsAvailable(true);
			onSummaryChange?.(nextData.summary);
			window.requestAnimationFrame(() => {
				const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
				reviewsHeadingRef.current?.scrollIntoView({
					behavior: reduceMotion ? "auto" : "smooth",
					block: "start",
				});
				reviewsHeadingRef.current?.focus({ preventScroll: true });
			});
		} catch (_error) {
			if (pageRequestRef.current === requestId) setReviewsError(copy.loadError);
		} finally {
			if (pageRequestRef.current === requestId) setReviewsLoading(false);
		}
	};

	const hasRealRating = normalizedSummary.ratingCount > 0;
	const publicReviewCount = Math.max(
		Number(pagination.totalItems || 0),
		reviews.length
	);

	return (
		<section className="section hotel-reviews-section" id="reviews" aria-labelledby="hotel-reviews-title">
			{celebrating ? (
				<div className="hotel-review-fireworks" aria-hidden="true">
					{Array.from({ length: 24 }, (_item, index) => (
						<i
							key={index}
							style={{
								"--review-particle-x": `${6 + ((index * 37) % 88)}%`,
								"--review-particle-delay": `${(index % 8) * 90}ms`,
								"--review-particle-color": ["#37d49c", "#ffb545", "#66b8ff", "#ffffff"][index % 4],
							}}
						/>
					))}
				</div>
			) : null}
			<div className="container hotel-reviews-wrap" dir={isArabic ? "rtl" : "ltr"}>
				<div className="hotel-reviews-head">
					<div>
						<p className="eyebrow">{copy.eyebrow}</p>
						<h2 className="section-title" id="hotel-reviews-title">{copy.title}</h2>
						<p className="section-copy">{copy.intro}</p>
					</div>
					{hasRealRating ? (
						<div
							className="hotel-review-summary"
							aria-label={
								isArabic
									? `\u0627\u0644\u062a\u0642\u064a\u064a\u0645 ${normalizedSummary.averageRating.toFixed(1)} \u0645\u0646 5\u060c \u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 ${normalizedSummary.ratingCount} \u062a\u0642\u064a\u064a\u0645`
									: `${normalizedSummary.averageRating.toFixed(1)} out of 5, ${normalizedSummary.ratingCount} ratings`
							}
						>
							<div className="hotel-review-score">
								<span>{copy.guestRating}</span>
								<strong dir="ltr">{normalizedSummary.averageRating.toFixed(1)}</strong>
								<StaticStars
									rating={normalizedSummary.averageRating}
									label={
										isArabic
											? `\u0627\u0644\u062a\u0642\u064a\u064a\u0645 ${normalizedSummary.averageRating.toFixed(1)} \u0645\u0646 5 \u0646\u062c\u0648\u0645`
											: `${normalizedSummary.averageRating.toFixed(1)} out of 5 stars`
									}
								/>
								<small>
									{copy.basedOn} <bdi dir="ltr">{normalizedSummary.ratingCount}</bdi>{" "}
									{normalizedSummary.ratingCount === 1 ? copy.ratingSingular : copy.ratingPlural}
								</small>
							</div>
							<div className="hotel-review-breakdown" aria-hidden="true">
								{[5, 4, 3, 2, 1].map((rating) => {
									const count = normalizedSummary.breakdown[rating] || 0;
									const width = normalizedSummary.ratingCount
										? (count / normalizedSummary.ratingCount) * 100
										: 0;
									return (
										<span key={rating}>
											<bdi dir="ltr">{rating}</bdi>
											<Star size={12} fill="currentColor" />
											<i><em style={{ width: `${width}%` }} /></i>
											<small dir="ltr">{count}</small>
										</span>
									);
								})}
							</div>
						</div>
					) : reviewsAvailable ? (
						<div className="hotel-review-first-rating">
							<Sparkles size={22} />
							<span>{copy.firstRating}</span>
						</div>
					) : (
						<div className="hotel-review-first-rating">
							<ShieldCheck size={22} />
							<span>{copy.ratingsUnavailable}</span>
						</div>
					)}
				</div>

				<div className="hotel-reviews-layout">
					<article className="premium-card hotel-review-form-card">
						<div className="hotel-review-card-heading">
							<div className="hotel-review-heading-icon"><Star size={22} /></div>
							<div>
								<h3 ref={formHeadingRef} tabIndex="-1">{copy.formTitle}</h3>
								<p>{hotelName}</p>
							</div>
						</div>

						{submittedRating ? (
							<div
								className={`hotel-review-success tier-${submittedRating}`}
								ref={successRef}
								tabIndex="-1"
								role="status"
								aria-live="polite"
							>
								<CheckCircle2 size={31} />
								<strong>{successMessage}</strong>
								{submittedRating <= 2 ? (
									<a className="btn btn-primary" href={whatsappHref} target="_blank" rel="noreferrer">
										<MessageCircle size={17} />
										{copy.whatsapp}
									</a>
								) : null}
							</div>
						) : (
							<form className="hotel-review-form" onSubmit={handleSubmit} noValidate>
								<fieldset className="hotel-review-rating-field">
									<legend>{copy.ratingLabel}</legend>
									<div className="hotel-review-rating-buttons">
										{[1, 2, 3, 4, 5].map((value) => (
											<button
												type="button"
												key={value}
												className={value <= form.rating ? "is-active" : undefined}
												onClick={() => updateForm("rating", value)}
												aria-label={
													isArabic
														? `\u062a\u0642\u064a\u064a\u0645 ${value} \u0645\u0646 5 \u0646\u062c\u0648\u0645`
														: `${value} ${value === 1 ? "star" : "stars"}`
												}
												aria-pressed={form.rating === value}
											>
												<Star size={29} fill={value <= form.rating ? "currentColor" : "none"} />
												<span>{value}</span>
											</button>
										))}
									</div>
								</fieldset>

								{isSignedIn ? (
									<div className="hotel-review-signed-in">
										<UserRound size={18} />
										<span>{copy.signedInAs} <strong>{signedInName}</strong></span>
									</div>
								) : (
									<div className="hotel-review-name-fields">
										<label className="field">
											<span>{copy.firstName}</span>
											<input
												value={form.firstName}
												onChange={(event) => updateForm("firstName", event.target.value)}
												autoComplete="given-name"
												maxLength={80}
												required
											/>
										</label>
										<label className="field">
											<span>{copy.lastName}</span>
											<input
												value={form.lastName}
												onChange={(event) => updateForm("lastName", event.target.value)}
												autoComplete="family-name"
												maxLength={80}
												required
											/>
										</label>
									</div>
								)}

								<label className="field hotel-review-comment-field">
									<span>{copy.comment}</span>
									<textarea
										value={form.comment}
										onChange={(event) => updateForm("comment", event.target.value)}
										placeholder={copy.commentPlaceholder}
										rows={4}
										maxLength={2000}
									/>
									<small dir="ltr">{form.comment.length}/2000</small>
								</label>

								<label className="field hotel-review-confirmation-field">
									<span>{copy.confirmation}</span>
									<input
										dir="ltr"
										value={form.confirmationNumber}
										onChange={(event) => updateForm("confirmationNumber", event.target.value)}
						autoComplete="off"
										maxLength={120}
										readOnly={invitationLocked}
									/>
									<small>{copy.confirmationHelp}</small>
								</label>
								{prefillState.message ? (
									<p className={`hotel-review-prefill ${prefillState.status}`} role={prefillState.status === "error" ? "alert" : "status"}>
										{prefillState.status === "success" ? <ShieldCheck size={17} /> : null}
										{prefillState.message}
									</p>
								) : null}
								{roomLabel && prefillState.status === "success" ? (
									<div className="hotel-review-room-detail">
										<BedDouble size={17} />
										<span>{roomLabel}</span>
									</div>
								) : null}
								{submitError ? <p className="hotel-review-error" role="alert">{submitError}</p> : null}
								<p className="hotel-review-privacy-note">
									<ShieldCheck size={16} />
									<span>{copy.privacyNote}</span>
								</p>
								<button className="btn btn-primary hotel-review-submit" type="submit" disabled={submitting}>
									<Star size={18} />
									{submitting ? copy.submitting : copy.submit}
								</button>
							</form>
						)}
					</article>

					<div className="hotel-review-list-shell" aria-busy={reviewsLoading}>
						<div className="hotel-review-list-heading">
							<h3 ref={reviewsHeadingRef} tabIndex="-1">{copy.recent}</h3>
							{publicReviewCount ? (
								<span>
									<bdi dir="ltr">{publicReviewCount}</bdi>{" "}
									{publicReviewCount === 1
										? copy.reviewSingular
										: copy.reviewPlural}
								</span>
							) : null}
						</div>
						{reviewsError ? <p className="hotel-review-error" role="alert">{reviewsError}</p> : null}
						{reviewsAvailable && reviews.length ? (
							<div className={`hotel-review-list${reviewsLoading ? " is-loading" : ""}`}>
								{reviews.map((review) => {
									const rating = boundedRating(review.rating);
									const ratingVisible = review.ratingVisible === true && rating > 0;
									const comment =
										review.commentVisible === true
											? cleanText(review.comment, 4000)
											: "";
									const date = formatReviewDate(review.createdAt, isArabic);
									return (
										<article className="premium-card hotel-review-item" key={review._id}>
											<div className="hotel-review-item-head">
												<div className="hotel-review-avatar" aria-hidden="true">
													{cleanText(review.displayName, 80).charAt(0).toUpperCase() || "G"}
												</div>
												<div>
													<strong>{cleanText(review.displayName, 100) || (isArabic ? "\u0636\u064a\u0641" : "Guest")}</strong>
													{date ? <time dateTime={String(review.createdAt).slice(0, 10)}>{date}</time> : null}
												</div>
												{ratingVisible ? (
													<div className="hotel-review-item-rating">
														<StaticStars
															rating={rating}
															label={
																isArabic
																	? `\u0627\u0644\u062a\u0642\u064a\u064a\u0645 ${rating} \u0645\u0646 5 \u0646\u062c\u0648\u0645`
																	: `${rating} out of 5 stars`
															}
														/>
														<bdi dir="ltr">{rating}.0</bdi>
													</div>
												) : null}
											</div>
											{comment ? (
												<p>{comment}</p>
											) : ratingVisible ? (
												<p className="is-rating-only">{copy.ratingOnly}</p>
											) : null}
											{review.verifiedStay ? (
												<span className="hotel-review-verified"><ShieldCheck size={14} />{copy.verified}</span>
											) : null}
										</article>
									);
								})}
							</div>
						) : (
							<div className="empty-state hotel-review-empty">
								{reviewsAvailable ? copy.firstRating : copy.ratingsUnavailable}
							</div>
						)}
						<PaginationControls
							currentPage={pagination.page}
							totalItems={publicReviewCount}
							pageSize={HOTEL_REVIEW_PAGE_SIZE}
							onPageChange={loadReviewsPage}
							label={copy.recent}
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
