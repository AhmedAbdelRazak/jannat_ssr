"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "antd";
import { ArrowUpRight, BedDouble, CalendarDays, CheckCircle2, Gift, MapPin, MessageCircle, Moon, ShoppingBag, Sparkles, Tag } from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import { safeNumber } from "../lib/booking";
import {
	buildDealPricingRows,
	countHotelDeals,
	dealNightlySar,
	dealTotalSar,
	resolveDealStay,
	roomDealGroups,
	toCommissionDecimal,
} from "../lib/deals";
import { ARABIC_BRAND_NAME, DEFAULT_HERO_IMAGE } from "../lib/constants";
import { firstImage, hotelLocation, roomTypeLabel, slugifyHotel, titleCase } from "../lib/format";
import { openJannatSupport } from "../lib/support";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const dealText = (isArabic) =>
	isArabic
		? {
				eyebrow: "\u0627\u0644\u0639\u0631\u0648\u0636 \u0648\u0627\u0644\u0628\u0627\u0642\u0627\u062a",
				title: "\u0628\u0627\u0642\u0627\u062a \u0645\u062e\u062a\u0627\u0631\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0641\u0646\u062f\u0642",
				copy: "\u0627\u062e\u062a\u0631 \u0639\u0631\u0636\u0627 \u0623\u0648 \u0628\u0627\u0642\u0629\u060c \u0648\u0633\u0646\u062b\u0628\u062a \u062a\u0648\u0627\u0631\u064a\u062e \u0627\u0644\u0639\u0631\u0636 \u0648\u0646\u0639\u0631\u0636\u0647\u0627 \u0628\u0627\u0644\u0647\u062c\u0631\u064a \u0648\u0627\u0644\u0645\u064a\u0644\u0627\u062f\u064a.",
				allTitle: "\u0623\u0641\u0636\u0644 \u0627\u0644\u0639\u0631\u0648\u0636 \u0648\u0627\u0644\u0628\u0627\u0642\u0627\u062a",
				allCopy: "\u063a\u0631\u0641 \u0645\u0646 \u0641\u0646\u0627\u062f\u0642 \u062c\u0646\u0629 \u0644\u062f\u064a\u0647\u0627 \u0639\u0631\u0648\u0636 \u0646\u0634\u0637\u0629 \u0623\u0648 \u0628\u0627\u0642\u0627\u062a \u0634\u0647\u0631\u064a\u0629.",
				offer: "\u0639\u0631\u0636",
				monthly: "\u0628\u0627\u0642\u0629 \u0634\u0647\u0631\u064a\u0629",
				valid: "\u0635\u0627\u0644\u062d",
				to: "\u0625\u0644\u0649",
				perNight: "\u0644\u0644\u064a\u0644\u0629",
				averageNightly: "\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0644\u064a\u0644\u0629",
				stayTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u0642\u0627\u0645\u0629",
				packageTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0628\u0627\u0642\u0629",
				offerTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0639\u0631\u0636",
				selectedStay: "\u062a\u0648\u0627\u0631\u064a\u062e \u062a\u062d\u062a\u0627\u062c \u062a\u0623\u0643\u064a\u062f",
				fixedDates: "\u062a\u0648\u0627\u0631\u064a\u062e \u0627\u0644\u0639\u0631\u0636 \u0645\u062b\u0628\u062a\u0629",
				gregorianDates: "\u0627\u0644\u0645\u064a\u0644\u0627\u062f\u064a",
				add: "\u0623\u0636\u0641 \u0644\u0644\u0633\u0644\u0629",
				ask: "\u062a\u062d\u062f\u062b \u0645\u0639 \u0627\u0644\u0627\u0633\u062a\u0642\u0628\u0627\u0644",
				viewHotel: "\u0639\u0631\u0636 \u0627\u0644\u0641\u0646\u062f\u0642",
				dealsCount: "\u0639\u0631\u0648\u0636 \u0645\u062a\u0627\u062d\u0629",
			}
		: {
				eyebrow: "Packages & offers",
				title: "Selected packages for this hotel",
				copy: "Choose an offer or package. Offer dates are fixed and shown in both Hijri and Gregorian dates.",
				allTitle: "Best offers and packages",
				allCopy: "Jannat Booking rooms with active special offers or monthly packages.",
				offer: "Special offer",
				monthly: "Monthly package",
				valid: "Valid",
				to: "to",
				perNight: "per night",
				averageNightly: "Avg. per night",
				stayTotal: "Stay total",
				packageTotal: "Package total",
				offerTotal: "Offer total",
				selectedStay: "Dates need confirmation",
				fixedDates: "Offer dates are fixed",
				gregorianDates: "Gregorian",
				add: "Add to cart",
				ask: "Chat With Reception",
				viewHotel: "View hotel",
				dealsCount: "available deals",
			};

const formatDealDate = (value) => {
	const date = new Date(`${String(value || "").slice(0, 10)}T00:00:00`);
	if (Number.isNaN(date.getTime())) return "";
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
};

const roomNameFor = (room = {}, isArabic = false) =>
	(isArabic && room.displayName_OtherLanguage) || room.displayName || roomTypeLabel(room.roomType);

function DealTile({ hotel = {}, room = {}, deal = {}, fallbackDates = {}, showHotelLink = false }) {
	const { addToCart, formatCurrency, hrefWithLanguage, isArabic, t } = useJannatApp();
	const text = dealText(isArabic);
	const hotelName = (isArabic && hotel.hotelName_OtherLanguage) || titleCase(hotel.hotelName);
	const roomName = roomNameFor(room, isArabic);
	const slug = slugifyHotel(hotel.hotelName);
	const commission = toCommissionDecimal(room, hotel);
	const stay = resolveDealStay(deal, fallbackDates);
	const pricingRows = buildDealPricingRows(deal, commission, stay.checkIn, stay.checkOut);
	const totalSar = pricingRows.reduce((sum, row) => sum + safeNumber(row.totalPriceWithCommission, 0), 0);
	const nightlySar = totalSar / Math.max(1, stay.nights);
	const packageTotalSar = dealTotalSar(deal, commission);
	const hijriLabel = isArabic ? stay.hijriRange?.labelAr : stay.hijriRange?.labelEn;
	const image = firstImage(room.photos, hotel.hotelPhotos, DEFAULT_HERO_IMAGE);
	const typeLabel = deal.type === "monthly" ? text.monthly : text.offer;
	const lockLabel = stay.locked ? text.fixedDates : text.selectedStay;
	const totalLabel = deal.type === "monthly" ? text.packageTotal : text.offerTotal;
	const supportMessage = isArabic
		? `\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645 ${ARABIC_BRAND_NAME}\u060c \u0623\u0631\u063a\u0628 \u0628\u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u0639\u0646 ${deal.name} - ${roomName} \u0641\u064a ${hotelName}.`
		: `Assalamu alaikum Jannat Booking, I am interested in ${deal.name} - ${roomName} at ${hotelName}.`;

	const handleAddDeal = () => {
		const averagePrice = totalSar / Math.max(1, pricingRows.length || 1);
		trackConversion(
			"addToCart",
			{
				content_name: deal.name,
				content_type: "hotel_deal",
				item_id: deal.id,
				hotel_id: hotel._id,
				value: totalSar || undefined,
				currency: totalSar ? "SAR" : undefined,
			},
			["Add Deal To Cart"]
		);
		addToCart({
			id: `${room._id || room.roomType}-${deal.type}-${deal.id}`,
			hotelId: hotel._id,
			hotelName,
			hotelSlug: slug,
			belongsTo: hotel?.belongsTo?._id || hotel?.belongsTo || "",
			hotelAddress: hotel.hotelAddress || "",
			hotelCity: hotel.hotelCity || "",
			hotelState: hotel.hotelState || "",
			hotelCountry: hotel.hotelCountry || "",
			guestPaymentAcceptance: hotel.guestPaymentAcceptance,
			roomId: room._id,
			roomType: room.roomType,
			roomName,
			roomNameOtherLanguage: room.displayName_OtherLanguage || "",
			roomColor: room.roomColor || "",
			defaultCost: pricingRows[0]?.rootPrice || room.defaultCost,
			roomCommission: commission * 100,
			bedsCount: room.bedsCount,
			adults: 1,
			children: 0,
			photos: Array.isArray(room.photos) ? room.photos : [],
			image,
			price: Number(averagePrice.toFixed(2)),
			amount: 1,
			checkIn: stay.checkIn,
			checkOut: stay.checkOut,
			pricingByDay: pricingRows,
			pricingByDayWithCommission: pricingRows,
			fromPackagesOffers: true,
			lockDates: stay.locked,
			datesLocked: stay.locked,
			packageMeta: {
				type: deal.type,
				pkgId: deal.id,
				roomId: room._id,
				name: deal.name,
				usesSelectedStayDates: stay.usesSelectedStayDates,
				hijriLabelAr: stay.hijriRange?.labelAr || "",
				hijriLabelEn: stay.hijriRange?.labelEn || "",
				checkInHijri: stay.hijriRange?.checkInHijri || null,
				checkOutHijri: stay.hijriRange?.checkOutHijri || null,
				totalSar: Number(packageTotalSar.toFixed(2)),
				nightlySar: Number(averagePrice.toFixed(2)),
				totalBaseSar: deal.type === "monthly" ? safeNumber(deal.monthBase, 0) : safeNumber(deal.base, 0),
				totalRootSar: deal.type === "monthly" ? safeNumber(deal.monthRoot, 0) : safeNumber(deal.root, 0),
				commissionRate: commission,
				nights: stay.nights,
				from: stay.checkIn,
				to: stay.checkOut,
			},
		});
	};

	return (
		<article className="deal-tile">
			<div className="deal-tile-media">
				<OptimizedImage src={image} alt={`${roomName} - ${deal.name}`} fill sizes="(max-width: 760px) 100vw, 260px" quality={72} />
				<span>
					<Tag size={14} />
					{typeLabel}
				</span>
			</div>
			<div className="deal-tile-body">
				<div className="deal-tile-head">
					<div>
						<small>{hotelName}</small>
						<h3>{deal.name}</h3>
					</div>
					<strong dir="ltr" className="ltr-value">{formatCurrency(totalSar)}</strong>
				</div>
				<p className="deal-room-name">
					<BedDouble size={15} />
					{roomName}
				</p>
				{hijriLabel ? (
					<p className="deal-hijri-line">
						<CalendarDays size={15} />
						<span>{hijriLabel}</span>
					</p>
				) : null}
				<p className="deal-date-line">
					<CalendarDays size={15} />
					<span className="deal-date-kind">{text.gregorianDates}</span>
					<bdi dir="ltr" className="ltr-value">{formatDealDate(stay.checkIn)} {text.to} {formatDealDate(stay.checkOut)}</bdi>
					<span>
						<Moon size={14} />
						<bdi dir="ltr" className="ltr-value">{stay.nights}</bdi> {stay.nights > 1 ? t("nights") : t("night")}
					</span>
				</p>
				<div className="deal-value-row">
					<span>
						<Sparkles size={14} />
						{lockLabel}
					</span>
					<em>{totalLabel}</em>
				</div>
				{totalSar ? (
					<p className="deal-stay-total">
						<span>{text.averageNightly}</span>
						<strong dir="ltr" className="ltr-value">{formatCurrency(dealNightlySar(deal, commission, stay.nights) || nightlySar)}</strong>
					</p>
				) : null}
				<div className="deal-actions">
					<Button type="primary" icon={<ShoppingBag size={16} />} onClick={handleAddDeal}>
						{text.add}
					</Button>
					<button
						type="button"
						className="btn btn-metal"
						onClick={() => openJannatSupport({ hotel, hotelName, message: supportMessage })}
					>
						<MessageCircle size={16} />
						{text.ask}
					</button>
					{showHotelLink ? (
						<Link className="btn btn-ghost" href={hrefWithLanguage(`/single-hotel/${slug}?section=packages`)}>
							{text.viewHotel}
							<ArrowUpRight size={15} />
						</Link>
					) : null}
				</div>
			</div>
		</article>
	);
}

function HotelDealBlock({ hotel = {}, fallbackDates = {}, showHotelLink = false }) {
	const { isArabic } = useJannatApp();
	const groups = useMemo(() => roomDealGroups(hotel), [hotel]);
	const text = dealText(isArabic);
	const hotelName = (isArabic && hotel.hotelName_OtherLanguage) || titleCase(hotel.hotelName);
	const location = hotelLocation(hotel);
	if (!groups.length) return null;

	return (
		<div className="hotel-deal-block">
			<div className="hotel-deal-block-head">
				<div>
					<span className="deal-hotel-kicker">
						<MapPin size={14} />
						{location || "Saudi Arabia"}
					</span>
					<h3>{hotelName}</h3>
				</div>
				<strong>
					<Gift size={16} />
					<bdi dir="ltr" className="ltr-value">{countHotelDeals(hotel)}</bdi> {text.dealsCount}
				</strong>
			</div>
			<div className="deal-grid">
				{groups.flatMap(({ room, deals }) =>
					deals.map((deal) => (
						<DealTile
							key={`${hotel._id}-${room._id}-${deal.type}-${deal.id}`}
							hotel={hotel}
							room={room}
							deal={deal}
							fallbackDates={fallbackDates}
							showHotelLink={showHotelLink}
						/>
					))
				)}
			</div>
		</div>
	);
}

export default function HotelDealsSection({ hotel = {}, fallbackDates = {}, className = "" }) {
	const { isArabic } = useJannatApp();
	const groups = useMemo(() => roomDealGroups(hotel), [hotel]);
	const text = dealText(isArabic);
	if (!groups.length) return null;

	return (
		<section className={`section hotel-deals-section ${className}`.trim()} id="packages">
			<div className="container hotel-deals-wrap" dir={isArabic ? "rtl" : "ltr"}>
				<div className="section-head">
					<div>
						<p className="eyebrow">{text.eyebrow}</p>
						<h2 className="section-title">{text.title}</h2>
						<p className="section-copy">{text.copy}</p>
					</div>
					<div className="hotel-deals-summary">
						<CheckCircle2 size={18} />
						<bdi dir="ltr" className="ltr-value">{countHotelDeals(hotel)}</bdi>
						<span>{text.dealsCount}</span>
					</div>
				</div>
				<HotelDealBlock hotel={hotel} fallbackDates={fallbackDates} />
			</div>
		</section>
	);
}

export function DealsShowcase({ hotels = [] }) {
	const { isArabic } = useJannatApp();
	const text = dealText(isArabic);
	const dealHotels = useMemo(
		() => (Array.isArray(hotels) ? hotels : []).filter((hotel) => roomDealGroups(hotel).length),
		[hotels]
	);

	return (
		<section className="section hotel-deals-section deals-showcase-section">
			<div className="container hotel-deals-wrap" dir={isArabic ? "rtl" : "ltr"}>
				<div className="section-head">
					<div>
						<p className="eyebrow">{text.eyebrow}</p>
						<h2 className="section-title">{text.allTitle}</h2>
						<p className="section-copy">{text.allCopy}</p>
					</div>
				</div>
				{dealHotels.length ? (
					<div className="deals-showcase-list">
						{dealHotels.map((hotel) => (
							<HotelDealBlock key={hotel._id || hotel.hotelName} hotel={hotel} showHotelLink />
						))}
					</div>
				) : (
					<div className="empty-state">
						{isArabic ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0631\u0648\u0636 \u0646\u0634\u0637\u0629 \u062d\u0627\u0644\u064a\u0627." : "There are no active Jannat Booking offers yet."}
					</div>
				)}
			</div>
		</section>
	);
}
