"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Button, Drawer } from "antd";
import { FacebookFilled, InstagramFilled, YoutubeFilled } from "@ant-design/icons";
import {
	Building2,
	CalendarDays,
	FileText,
	Gift,
	Globe2,
	Home,
	Info,
	LogIn,
	LogOut,
	Mail,
	Menu,
	MessageCircle,
	Phone,
	ShoppingCart,
	UserPlus,
	UserRound,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { trackConversion } from "../lib/analyticsEvents";
import { CONTACT_EMAIL, DEFAULT_LOGO, PHONE_DISPLAY, WHATSAPP_NUMBER } from "../lib/constants";
import { labelFor } from "../lib/i18n";
import { useJannatApp } from "./JannatAppProvider";
import CurrencySelector from "./CurrencySelector";
import EmailText, { emailActionProps } from "./EmailText";
import OptimizedImage from "./OptimizedImage";

const CartDrawer = dynamic(() => import("./CartDrawer"), { ssr: false });

const iconMap = {
	home: Home,
	hotels: Building2,
	offers: Gift,
	terms: FileText,
	about: Info,
	contact: Phone,
};

const headerNavItems = [
	{ href: "/", icon: "home", label: { en: "Home", ar: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629" } },
	{
		href: "/our-hotels",
		icon: "hotels",
		label: { en: "Our Hotels", ar: "\u0641\u0646\u0627\u062f\u0642\u0646\u0627" },
	},
	{
		href: "/jannat-offers-monthly-reservations",
		icon: "offers",
		label: { en: "Offers", ar: "\u0627\u0644\u0639\u0631\u0648\u0636" },
		requiresOffers: true,
	},
	{
		href: "/about",
		icon: "about",
		label: { en: "About Us", ar: "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0639\u0646\u0627" },
	},
	{ href: "/contact", icon: "contact", label: { en: "Call Us", ar: "\u0627\u062a\u0635\u0644 \u0628\u0646\u0627" } },
];

const languageMeta = {
	en: {
		code: "EN",
		label: "English",
		flag: "/flags/usa.svg",
		nextLabel: "Switch to Arabic",
	},
	ar: {
		code: "AR",
		label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
		flag: "/flags/ksa.svg",
		nextLabel: "Switch to English",
	},
};

const socialItems = [
	{ key: "facebook", label: "Facebook", Icon: FacebookFilled },
	{ key: "instagram", label: "Instagram", Icon: InstagramFilled },
	{ key: "youtube", label: "YouTube", Icon: YoutubeFilled },
];

export default function Header({ website = {}, hasOffers = false }) {
	const pathname = usePathname();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const {
		language,
		isArabic,
		t,
		toggleLanguage,
		totals,
		cartOpen,
		setCartOpen,
		hrefWithLanguage,
		auth,
		isSignedIn,
		signOut,
	} = useJannatApp();
	const logo = website?.janatLogo?.url || DEFAULT_LOGO;
	const email = CONTACT_EMAIL;
	const phone = website?.phone || PHONE_DISPLAY;
	const whatsapp = website?.whatsappNumber || WHATSAPP_NUMBER;
	const accountName = auth?.user?.name || auth?.user?.email || t("account");
	const isActiveNavItem = (item) =>
		item.href === "/" ? pathname === "/" : String(pathname || "").startsWith(item.href);
	const targetLanguageCode = language === "ar" ? "en" : "ar";
	const targetLanguage = languageMeta[targetLanguageCode] || languageMeta.ar;
	const languageToggleLabel = language === "ar" ? "Switch to English" : "Switch to Arabic";
	const overlaysHero = pathname === "/" || String(pathname || "").startsWith("/single-hotel");
	const visibleHeaderNavItems = headerNavItems.filter((item) => !item.requiresOffers || hasOffers);

	useEffect(() => {
		const onScroll = () => setIsScrolled(window.scrollY > 18);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const languageToggle = (className = "") => (
		<button
			type="button"
			onClick={toggleLanguage}
			className={`language-toggle ${className}`.trim()}
			aria-label={languageToggleLabel}
			title={languageToggleLabel}
		>
			<span className="language-flag">
				<img src={targetLanguage.flag} alt="" width="22" height="15" loading="eager" />
			</span>
			<span className="language-code">{targetLanguage.code}</span>
			<Globe2 size={15} />
		</button>
	);

	const menu = (
		<nav className="main-nav" aria-label="Main navigation">
			{visibleHeaderNavItems.map((item) => {
				const active = isActiveNavItem(item);
				return (
					<Link
						className={active ? "active" : ""}
						data-nav-item={item.icon}
						href={hrefWithLanguage(item.href)}
						key={item.href}
					>
						{labelFor(language, item.label)}
					</Link>
				);
			})}
		</nav>
	);

	return (
		<>
			<div className="top-strip" dir={isArabic ? "rtl" : "ltr"}>
				<div className="header-container top-strip-inner">
					<div className="top-contact">
						<a onClick={() => trackConversion("contact", { method: "header_email" }, ["Header Email"])} {...emailActionProps(email)}>
							<Mail size={15} />
							<EmailText email={email} />
						</a>
						<a
							href={`https://wa.me/${whatsapp}`}
							target="_blank"
							rel="noreferrer"
							onClick={() => trackConversion("contact", { method: "header_whatsapp" }, ["Header WhatsApp"])}
						>
							<MessageCircle size={16} />
							<bdi dir="ltr" className="ltr-value">{phone}</bdi>
						</a>
						<Link className="top-terms-link" href={hrefWithLanguage("/terms-conditions")}>
							<FileText size={14} />
							{isArabic ? "\u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062d\u0643\u0627\u0645" : "Terms & Conditions"}
						</Link>
					</div>
					<div className="top-actions">
						{languageToggle("top-language-toggle")}
						<CurrencySelector compact className="top-currency-control" />
						<div className="top-socials" aria-label="Social links">
							{socialItems.map(({ key, label, Icon }) => (
								<Link
									href={hrefWithLanguage("/")}
									aria-label={label}
									title={label}
									key={key}
									onClick={() =>
										trackConversion(
											"socialClick",
											{ channel: key, placement: "header" },
											[`Header ${label}`]
										)
									}
								>
									<Icon aria-hidden="true" />
								</Link>
							))}
						</div>
						{!isSignedIn ? (
							<Link className="top-property-link" href={hrefWithLanguage("/list-property")}>
								{isArabic ? "\u0623\u0636\u0641 \u0641\u0646\u062f\u0642\u0643" : "List Your Property"}
							</Link>
						) : null}
						{isSignedIn ? (
							<>
								<Link className="top-account-link" href={hrefWithLanguage("/dashboard")}>
									{isArabic ? "\u0645\u0631\u062d\u0628\u0627" : "Hello"} {String(accountName).split(" ")[0]}
								</Link>
								<button type="button" className="top-signout" onClick={signOut}>
									{t("signout")}
								</button>
							</>
						) : (
							<>
								<Link className="top-auth-link" href={hrefWithLanguage("/signup")}>
									{t("signup")}
								</Link>
								<Link className="top-auth-link" href={hrefWithLanguage("/signin")}>
									{t("signin")}
								</Link>
							</>
						)}
					</div>
				</div>
			</div>

			<header className={`site-header ${overlaysHero ? "over-hero" : ""} ${isScrolled ? "is-scrolled" : "is-top"}`} dir={isArabic ? "rtl" : "ltr"}>
				<div className="main-strip">
				<div className="header-container main-strip-inner">
					<Link className="logo" href={hrefWithLanguage("/")} aria-label="Jannat Booking home">
						<OptimizedImage src={logo} alt="Jannat Booking" width={132} height={58} sizes="132px" priority />
					</Link>
					{menu}
					<div className="header-actions">
						{languageToggle("icon-action mobile-language-action")}
						<button className="icon-action cart-icon-action" type="button" onClick={() => setCartOpen(true)} aria-label={t("cart")}>
							<Badge className="cart-icon-badge" count={totals.rooms} size="small" offset={[4, -3]}>
								<ShoppingCart size={20} />
							</Badge>
						</button>
						<Button
							className="mobile-menu-button"
							type="text"
							icon={<Menu size={23} />}
							onClick={() => setMobileOpen(true)}
							aria-label="Open menu"
						/>
					</div>
				</div>
				</div>

			<Drawer
				open={mobileOpen}
				onClose={() => setMobileOpen(false)}
				placement={isArabic ? "left" : "right"}
				size={330}
				closeIcon={<X size={20} />}
				className="jannat-mobile-drawer"
			>
				<div className="mobile-menu-content">
					<div className="mobile-drawer-logo">
						<OptimizedImage src={logo} alt="Jannat Booking" width={150} height={66} sizes="150px" priority />
					</div>
					{visibleHeaderNavItems.map((item) => {
						const Icon = iconMap[item.icon] || Home;
						const active = isActiveNavItem(item);
						return (
							<Link
								className={active ? "active" : ""}
								href={hrefWithLanguage(item.href)}
								key={item.href}
								onClick={() => setMobileOpen(false)}
							>
								<Icon size={18} />
								{labelFor(language, item.label)}
							</Link>
						);
					})}
					<Link href={hrefWithLanguage("/terms-conditions")} onClick={() => setMobileOpen(false)}>
						<FileText size={18} />
						{isArabic ? "\u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062d\u0643\u0627\u0645" : "Terms & Conditions"}
					</Link>
					{isSignedIn ? (
						<div className="mobile-auth-panel signed-in">
							<span>
								<UserRound size={18} />
								{t("signedInAs")} <b>{accountName}</b>
							</span>
							<button
								type="button"
								onClick={() => {
									signOut();
									setMobileOpen(false);
								}}
							>
								<LogOut size={18} />
								{t("signout")}
							</button>
						</div>
					) : (
						<div className="mobile-auth-panel">
							<Link href={hrefWithLanguage("/signin")} onClick={() => setMobileOpen(false)}>
								<LogIn size={18} />
								{t("signin")}
							</Link>
							<Link href={hrefWithLanguage("/signup")} onClick={() => setMobileOpen(false)}>
								<UserPlus size={18} />
								{t("signup")}
							</Link>
						</div>
					)}
					{languageToggle("mobile-line-button drawer-language-toggle")}
					<CurrencySelector className="drawer-currency-control" />
					<button
						type="button"
						onClick={() => {
							setMobileOpen(false);
							setCartOpen(true);
						}}
						className="mobile-line-button"
					>
						<ShoppingCart size={18} />
						{t("cart")} <span dir="ltr" className="ltr-value">({totals.rooms})</span>
					</button>
					<a
						className="mobile-cta"
						href={`https://wa.me/${whatsapp}`}
						target="_blank"
						rel="noreferrer"
						onClick={() => trackConversion("contact", { method: "mobile_whatsapp" }, ["Mobile WhatsApp"])}
					>
						<MessageCircle size={18} />
						{t("whatsapp")}
					</a>
					<Link className="mobile-cta secondary" href={hrefWithLanguage("/rooms")} onClick={() => setMobileOpen(false)}>
						<CalendarDays size={18} />
						{t("searchRooms")}
					</Link>
				</div>
			</Drawer>
			{cartOpen ? <CartDrawer /> : null}
			</header>
		</>
	);
}
