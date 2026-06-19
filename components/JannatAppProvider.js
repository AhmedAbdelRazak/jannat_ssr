"use client";

import { App as AntdApp, ConfigProvider } from "antd";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import dayjs from "dayjs";
import { apiUrl } from "../lib/api";
import { buildRoomPricing, cartRoomsCount, cartTotal, defaultGuestPaymentAcceptance, generateDateRange, safeNumber } from "../lib/booking";
import {
	DEFAULT_CURRENCY,
	DEFAULT_CURRENCY_RATES,
	addCurrencyToHref,
	convertSarAmount,
	currencyCode,
	currencyFromSearch,
	currencyOptionLabel,
	currencyOptions as getCurrencyOptions,
	normalizeCurrency,
} from "../lib/currency";
import { LANGUAGES, getText } from "../lib/i18n";
import { addLanguageToHref, languageFromSearch, normalizeLanguage } from "../lib/language";

const JannatAppContext = createContext(null);
const LANGUAGE_KEY = "jannatBookingLanguage";
const CURRENCY_KEY = "selectedCurrency";
const CART_KEY = "jannatBookingCart";
const AUTH_KEY = "jannatBookingAuth";

const dateOffset = (days) => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
};

const normalizeCartDate = (value, fallback) => {
	const date = dayjs(value);
	return date.isValid() ? date.format("YYYY-MM-DD") : fallback;
};

const pricingRowsMatchDates = (rows = [], dates = []) =>
	Array.isArray(rows) &&
	rows.length === dates.length &&
	rows.every((row, index) => String(row?.date || row?.calendarDate || "").slice(0, 10) === dates[index]);

const cartItemMatches = (item = {}, id, match = {}) => {
	if (item.id !== id) return false;
	if (match.checkIn && item.checkIn !== match.checkIn) return false;
	if (match.checkOut && item.checkOut !== match.checkOut) return false;
	return true;
};

const mergeCartItems = (items = []) => {
	const merged = [];
	items.map(normalizeItem).forEach((item) => {
		const index = merged.findIndex((row) => row.id === item.id);
		if (index === -1) {
			merged.push(item);
			return;
		}
		merged[index] = {
			...merged[index],
			amount: Math.min(20, Number(merged[index].amount || 1) + Number(item.amount || 1)),
		};
	});
	return merged;
};

const normalizeItem = (item = {}, forcedDates = {}) => {
	const checkIn = normalizeCartDate(forcedDates.checkIn || item.checkIn || item.startDate, dateOffset(1));
	const rawCheckOut = normalizeCartDate(forcedDates.checkOut || item.checkOut || item.endDate, dateOffset(4));
	const checkOut = dayjs(rawCheckOut).isAfter(dayjs(checkIn))
		? rawCheckOut
		: dayjs(checkIn).add(1, "day").format("YYYY-MM-DD");
	const amount = Math.max(1, Number(item.amount || 1));
	const price = Math.max(0, Number(item.price || 0));
	const defaultCost = safeNumber(item.defaultCost, price);
	const roomCommission = safeNumber(item.roomCommission, 10);
	const pricingRate = Array.isArray(item.pricingRate) ? item.pricingRate : [];
	const storedPricingByDay = Array.isArray(item.pricingByDay) ? item.pricingByDay : [];
	const storedPricingByDayWithCommission = Array.isArray(item.pricingByDayWithCommission)
		? item.pricingByDayWithCommission
		: storedPricingByDay;
	const dateRange = generateDateRange(checkIn, checkOut);
	const shouldReusePricing =
		pricingRowsMatchDates(storedPricingByDayWithCommission, dateRange) &&
		pricingRowsMatchDates(storedPricingByDay.length ? storedPricingByDay : storedPricingByDayWithCommission, dateRange);
	const recalculatedPricing = shouldReusePricing
		? {
				pricingByDay: storedPricingByDay.length ? storedPricingByDay : storedPricingByDayWithCommission,
				pricingByDayWithCommission: storedPricingByDayWithCommission,
			}
		: buildRoomPricing(
				{
					...item,
					price: { basePrice: price },
					defaultCost,
					roomCommission,
					pricingRate,
				},
				checkIn,
				checkOut
			);
	return {
		id: String(item.id || `${item.hotelId || "hotel"}-${item.roomType || "room"}`),
		hotelId: item.hotelId || "",
		hotelName: item.hotelName || "Jannat Booking",
		hotelSlug: item.hotelSlug || "",
		belongsTo: item.belongsTo || item.ownerId || "",
		hotelAddress: item.hotelAddress || "",
		hotelCity: item.hotelCity || "",
		hotelState: item.hotelState || "",
		hotelCountry: item.hotelCountry || "",
		guestPaymentAcceptance: item.guestPaymentAcceptance || defaultGuestPaymentAcceptance,
		roomId: item.roomId || "",
		roomType: item.roomType || "",
		roomName: item.roomName || "Room",
		roomNameOtherLanguage: item.roomNameOtherLanguage || "",
		roomColor: item.roomColor || "",
		defaultCost,
		roomCommission,
		bedsCount: safeNumber(item.bedsCount, 0),
		adults: Math.max(1, safeNumber(item.adults, 1)),
		children: Math.max(0, safeNumber(item.children, 0)),
		photos: Array.isArray(item.photos) ? item.photos : item.image ? [{ url: item.image }] : [],
		image: item.image || "",
		price,
		amount,
		checkIn,
		checkOut,
		pricingRate,
		pricingByDay: recalculatedPricing.pricingByDay,
		pricingByDayWithCommission: recalculatedPricing.pricingByDayWithCommission,
	};
};

const normalizeSharedCartDates = (items = [], forcedDates = {}) => {
	const normalized = items.map((item) => normalizeItem(item, forcedDates));
	if (!normalized.length) return [];
	const sharedDates = {
		checkIn: forcedDates.checkIn || normalized[0].checkIn,
		checkOut: forcedDates.checkOut || normalized[0].checkOut,
	};
	return mergeCartItems(normalized.map((item) => normalizeItem(item, sharedDates)));
};

const nightsBetween = (start, end) => {
	const startDate = new Date(`${start}T00:00:00`);
	const endDate = new Date(`${end}T00:00:00`);
	const diff = Math.round((endDate - startDate) / 86400000);
	return Math.max(1, Number.isFinite(diff) ? diff : 1);
};

export function JannatAppProvider({ children, initialLanguage = "en" }) {
	const pathname = usePathname();
	const normalizedInitialLanguage = normalizeLanguage(initialLanguage) || "en";
	const [language, setLanguageState] = useState(normalizedInitialLanguage);
	const [languageReady, setLanguageReady] = useState(false);
	const [syncLanguageUrl, setSyncLanguageUrl] = useState(false);
	const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);
	const [currencyRates, setCurrencyRates] = useState(DEFAULT_CURRENCY_RATES);
	const [syncCurrencyUrl, setSyncCurrencyUrl] = useState(false);
	const [cart, setCart] = useState([]);
	const [cartOpen, setCartOpen] = useState(false);
	const [auth, setAuth] = useState(null);

	useEffect(() => {
		const urlLanguage = languageFromSearch(window.location.search);
		const storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
		const savedLanguage = normalizeLanguage(storedLanguage);
		const nextLanguage = urlLanguage || savedLanguage || normalizedInitialLanguage;
		const urlCurrency = currencyFromSearch(window.location.search);
		const savedCurrency = normalizeCurrency(window.localStorage.getItem(CURRENCY_KEY));
		const nextCurrency = urlCurrency || savedCurrency || DEFAULT_CURRENCY;
		setLanguageState(nextLanguage);
		setSyncLanguageUrl(Boolean(urlLanguage || savedLanguage === "ar"));
		setCurrencyState(nextCurrency);
		setSyncCurrencyUrl(Boolean(urlCurrency || savedCurrency !== DEFAULT_CURRENCY));
		setLanguageReady(true);
		try {
			const storedCart = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
			if (Array.isArray(storedCart)) setCart(normalizeSharedCartDates(storedCart));
		} catch (_error) {
			setCart([]);
		}
		try {
			const storedAuth = JSON.parse(window.localStorage.getItem(AUTH_KEY) || "null");
			if (storedAuth?.token && storedAuth?.user?._id) setAuth(storedAuth);
		} catch (_error) {
			setAuth(null);
		}
	}, [normalizedInitialLanguage]);

	useEffect(() => {
		if (!languageReady) return;
		window.localStorage.setItem(LANGUAGE_KEY, language);
		window.localStorage.setItem(CURRENCY_KEY, currency);
		document.documentElement.lang = language;
		document.documentElement.dir = LANGUAGES[language]?.dir || "ltr";
		const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		let nextHref = currentHref;
		if (syncLanguageUrl) nextHref = addLanguageToHref(nextHref, language);
		nextHref = addCurrencyToHref(nextHref, currency, syncCurrencyUrl);
		if (nextHref !== currentHref) {
			window.history.replaceState(window.history.state, "", nextHref);
		}
	}, [currency, language, languageReady, pathname, syncCurrencyUrl, syncLanguageUrl]);

	useEffect(() => {
		if (!languageReady) return;
		let cancelled = false;
		const loadRates = async () => {
			try {
				const res = await fetch(apiUrl("/currency-rates"), {
					headers: { Accept: "application/json" },
					cache: "no-store",
				});
				const data = res.ok ? await res.json() : null;
				const nextRates = {
					SAR_USD: Number(data?.SAR_USD || data?.sarUsd || data?.usd || DEFAULT_CURRENCY_RATES.SAR_USD),
					SAR_EUR: Number(data?.SAR_EUR || data?.sarEur || data?.eur || DEFAULT_CURRENCY_RATES.SAR_EUR),
				};
				if (!cancelled) {
					setCurrencyRates({
						SAR_USD: Number.isFinite(nextRates.SAR_USD) ? nextRates.SAR_USD : DEFAULT_CURRENCY_RATES.SAR_USD,
						SAR_EUR: Number.isFinite(nextRates.SAR_EUR) ? nextRates.SAR_EUR : DEFAULT_CURRENCY_RATES.SAR_EUR,
					});
				}
			} catch (_error) {
				if (!cancelled) setCurrencyRates(DEFAULT_CURRENCY_RATES);
			}
		};
		loadRates();
		return () => {
			cancelled = true;
		};
	}, [languageReady]);

	useEffect(() => {
		const onPopState = () => {
			const urlLanguage = languageFromSearch(window.location.search);
			if (urlLanguage) {
				setSyncLanguageUrl(true);
				setLanguageState(urlLanguage);
			}
			const urlCurrency = currencyFromSearch(window.location.search);
			setCurrencyState(urlCurrency || DEFAULT_CURRENCY);
			setSyncCurrencyUrl(Boolean(urlCurrency));
		};
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	useEffect(() => {
		window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
	}, [cart]);

	useEffect(() => {
		if (!languageReady) return;
		if (auth?.token && auth?.user?._id) {
			window.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
		} else {
			window.localStorage.removeItem(AUTH_KEY);
		}
	}, [auth, languageReady]);

	const setLanguage = useCallback((nextLanguage) => {
		setSyncLanguageUrl(true);
		setLanguageState((current) => {
			const next =
				typeof nextLanguage === "function" ? nextLanguage(current) : nextLanguage;
			return normalizeLanguage(next) || current;
		});
	}, []);

	const setCurrency = useCallback((nextCurrency) => {
		setSyncCurrencyUrl(true);
		setCurrencyState((current) => {
			const next =
				typeof nextCurrency === "function" ? nextCurrency(current) : nextCurrency;
			return normalizeCurrency(next) || current;
		});
	}, []);

	const toggleLanguage = useCallback(() => {
		setLanguage((current) => (current === "ar" ? "en" : "ar"));
	}, [setLanguage]);

	const hrefWithLanguage = useCallback(
		(href) => addCurrencyToHref(addLanguageToHref(href, language), currency, syncCurrencyUrl),
		[currency, language, syncCurrencyUrl]
	);

	const formatCurrency = useCallback(
		(value = 0) => {
			const amount = Number(value || 0);
			if (!Number.isFinite(amount) || amount <= 0) return getText(language, "priceOnRequest");
			const selectedCurrency = normalizeCurrency(currency) || DEFAULT_CURRENCY;
			const convertedAmount = convertSarAmount(amount, selectedCurrency, currencyRates);
			const digits = selectedCurrency === "sar" ? 0 : 2;
			const formattedAmount = new Intl.NumberFormat("en-US", {
				minimumFractionDigits: digits,
				maximumFractionDigits: digits,
			}).format(convertedAmount);
			return language === "ar"
				? `${formattedAmount} ${currencyOptionLabel(selectedCurrency, language)}`
				: `${currencyCode(selectedCurrency)} ${formattedAmount}`;
		},
		[currency, currencyRates, language]
	);

	const addToCart = useCallback((item) => {
		setCart((current) => {
			const sharedDates = current[0]
				? { checkIn: current[0].checkIn, checkOut: current[0].checkOut }
				: {};
			return normalizeSharedCartDates([...current, normalizeItem(item, sharedDates)], sharedDates);
		});
		setCartOpen(true);
	}, []);

	const updateCartItem = useCallback((id, patch = {}, match = {}) => {
		setCart((current) =>
			normalizeSharedCartDates(
				current.map((item) =>
					cartItemMatches(item, id, match) ? normalizeItem({ ...item, ...patch }) : item
				)
			)
		);
	}, []);

	const removeCartItem = useCallback((id, match = {}) => {
		setCart((current) => current.filter((item) => !cartItemMatches(item, id, match)));
	}, []);

	const updateCartDates = useCallback((checkInValue, checkOutValue) => {
		const checkIn = normalizeCartDate(checkInValue, dateOffset(1));
		const rawCheckOut = normalizeCartDate(checkOutValue, dateOffset(4));
		const checkOut = dayjs(rawCheckOut).isAfter(dayjs(checkIn))
			? rawCheckOut
			: dayjs(checkIn).add(1, "day").format("YYYY-MM-DD");
		setCart((current) => normalizeSharedCartDates(current, { checkIn, checkOut }));
	}, []);

	const clearCart = useCallback(() => setCart([]), []);

	const setAuthSession = useCallback((session) => {
		if (session?.token && session?.user?._id) {
			setAuth({
				token: session.token,
				user: session.user,
			});
		}
	}, []);

	const signOut = useCallback(() => {
		setAuth(null);
	}, []);

	const totals = useMemo(() => {
		return {
			rooms: cartRoomsCount(cart),
			nights: cart.reduce(
				(max, item) => Math.max(max, nightsBetween(item.checkIn, item.checkOut)),
				0
			),
			amount: cartTotal(cart),
		};
	}, [cart]);

	const value = useMemo(
		() => ({
			language,
			isArabic: language === "ar",
			direction: LANGUAGES[language]?.dir || "ltr",
			t: (key) => getText(language, key),
			toggleLanguage,
			setLanguage,
			currency,
			currencyRates,
			setCurrency,
			currencyOptions: getCurrencyOptions(language, true),
			convertCurrency: (amount) => convertSarAmount(amount, currency, currencyRates),
			formatCurrency,
			hrefWithLanguage,
			cart,
			totals,
			cartOpen,
			setCartOpen,
			auth,
			isSignedIn: Boolean(auth?.token && auth?.user?._id),
			setAuthSession,
			signOut,
			addToCart,
			updateCartItem,
			updateCartDates,
			removeCartItem,
			clearCart,
			nightsBetween,
		}),
		[
			addToCart,
			auth,
			cart,
			cartOpen,
			clearCart,
			currency,
			currencyRates,
			hrefWithLanguage,
			formatCurrency,
			language,
			removeCartItem,
			setCurrency,
			setAuthSession,
			setLanguage,
			signOut,
			syncCurrencyUrl,
			toggleLanguage,
			totals,
			updateCartItem,
			updateCartDates,
		]
	);

	return (
		<ConfigProvider
			direction={value.direction}
			theme={{
				token: {
					borderRadius: 8,
					colorPrimary: "#102033",
					colorInfo: "#0b8f6a",
					colorSuccess: "#0b8f6a",
					fontFamily:
						language === "ar"
							? '"Tajawal", "Cairo", "Noto Kufi Arabic", "Segoe UI", Arial, sans-serif'
							: '"Inter", "Segoe UI", Arial, sans-serif',
				},
			}}
		>
			<AntdApp>
				<JannatAppContext.Provider value={value}>{children}</JannatAppContext.Provider>
			</AntdApp>
		</ConfigProvider>
	);
}

export const useJannatApp = () => {
	const context = useContext(JannatAppContext);
	if (!context) throw new Error("useJannatApp must be used inside JannatAppProvider");
	return context;
};
