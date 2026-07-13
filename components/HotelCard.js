"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
	AirVent,
	ArrowRight,
	Bath,
	BedDouble,
	BookOpen,
	Car,
	CheckCircle2,
	Coffee,
	ConciergeBell,
	Eye,
	Footprints,
	Headset,
	MapPin,
	Mountain,
	ParkingCircle,
	Plane,
	Shirt,
	Snowflake,
	Star,
	Store,
	Tv,
	Utensils,
	Wifi,
} from "lucide-react";
import { DEFAULT_HERO_IMAGE } from "../lib/constants";
import { trackConversion } from "../lib/analyticsEvents";
import { drivingDistance, hotelLocation, slugifyHotel, titleCase, walkingDistanceOnly } from "../lib/format";
import {
	hotelCardFeatures,
	hotelCardImages,
	hotelCardPrice,
} from "../lib/hotelCardData.mjs";
import { resolveHotelRating } from "../lib/hotelRatings.mjs";
import { roomTypeCountLabel } from "../lib/roomLabels";
import { openJannatSupport } from "../lib/support";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const featureIcon = (feature = "") => {
	const text = String(feature).toLowerCase();
	if (text.includes("wifi") || text.includes("internet")) return Wifi;
	if (text.includes("tv") || text.includes("television")) return Tv;
	if (text.includes("air") || text.includes("a/c") || text.includes("conditioning")) return AirVent;
	if (text.includes("restaurant") || text.includes("halal")) return Utensils;
	if (text.includes("parking")) return ParkingCircle;
	if (text.includes("service") || text.includes("reception")) return ConciergeBell;
	if (text.includes("laundry")) return Shirt;
	if (text.includes("coffee") || text.includes("dates") || text.includes("mini bar")) return Coffee;
	if (text.includes("quran")) return BookOpen;
	if (text.includes("mountain")) return Mountain;
	if (text.includes("view")) return Eye;
	if (text.includes("shuttle") || text.includes("haram")) return Car;
	if (text.includes("pilgrimage")) return Plane;
	if (text.includes("bath")) return Bath;
	if (text.includes("souk") || text.includes("market")) return Store;
	if (text.includes("smoking")) return Snowflake;
	return CheckCircle2;
};

const addressLine = (hotel = {}) =>
	hotel.hotelAddress
		? String(hotel.hotelAddress)
				.split(",")
				.slice(0, 2)
				.join(", ")
		: hotelLocation(hotel) || "Saudi Arabia";

export default function HotelCard({ hotel = {}, priority = false, optimizeImages = false }) {
	const { t, language, isArabic, hrefWithLanguage, formatCurrency } = useJannatApp();
	const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);
	const [activeImageIndex, setActiveImageIndex] = useState(0);
	const touchStartRef = useRef({ x: 0, y: 0 });
	const swipeHandledRef = useRef(false);
	const images = Array.isArray(hotel.cardImages)
		? hotel.cardImages
		: hotelCardImages(hotel, DEFAULT_HERO_IMAGE);
	const image = images[activeImageIndex] || images[0] || DEFAULT_HERO_IMAGE;
	const slug = slugifyHotel(hotel.hotelName);
	const price = Number.isFinite(Number(hotel.cardPrice))
		? Number(hotel.cardPrice)
		: hotelCardPrice(hotel);
	const oldPrice = price ? Math.ceil(price * 1.1) : 0;
	const roomsCount = Number.isFinite(Number(hotel.cardRoomCount))
		? Math.max(0, Math.trunc(Number(hotel.cardRoomCount)))
		: (hotel.roomCountDetails || []).length;
	const roomTypesLabel = roomTypeCountLabel(roomsCount, isArabic);
	const walking = walkingDistanceOnly(hotel);
	const driving = drivingDistance(hotel);
	const features = Array.isArray(hotel.cardFeatures)
		? hotel.cardFeatures
		: hotelCardFeatures(hotel);
	const visibleFeatures = amenitiesExpanded ? features : features.slice(0, 15);
	const displayName =
		isArabic && hotel.hotelName_OtherLanguage
			? hotel.hotelName_OtherLanguage
			: titleCase(hotel.hotelName);
	const { rating, ratingCount, hasRealRating } = resolveHotelRating(hotel);
	const showDrivingDistance = driving && driving !== walking;
	const labels = {
		perNight: isArabic ? "/ \u0644\u064a\u0644\u0629" : "/ night",
		freeCancellation: isArabic ? "\u0625\u0644\u063a\u0627\u0621 \u0645\u062c\u0627\u0646\u064a" : "Free cancellation",
		chat: isArabic ? "تحدث مع الاستقبال" : "Chat With Reception",
		available: isArabic ? "\u0645\u062a\u0627\u062d" : "Available",
		showMore: isArabic ? "\u0639\u0631\u0636 \u0623\u0643\u062b\u0631" : "Show more",
		showLess: isArabic ? "\u0639\u0631\u0636 \u0623\u0642\u0644" : "Show less",
		walkingToHaram: isArabic ? "\u0645\u0634\u064a\u0627\u064b \u0625\u0644\u0649 \u0627\u0644\u062d\u0631\u0645" : "walk to Al Haram",
		drivingToHaram: isArabic ? "\u0628\u0627\u0644\u0633\u064a\u0627\u0631\u0629 \u0625\u0644\u0649 \u0627\u0644\u062d\u0631\u0645" : "drive to Al Haram",
	};

	const handleOpenChat = () => {
		trackConversion(
			"lead",
			{ content_name: displayName, content_type: "hotel", hotel_id: hotel._id },
			["Hotel Chat Lead"]
		);
		openJannatSupport({
			hotel,
			hotelName: displayName,
		});
	};
	const trackHotelView = () => {
		trackConversion(
			"viewHotel",
			{
				content_name: displayName,
				content_type: "hotel",
				item_id: hotel._id,
				value: price || undefined,
				currency: price ? "SAR" : undefined,
			},
			["View Hotel"]
		);
	};

	const showImage = (index) => {
		if (!images.length) return;
		setActiveImageIndex((index + images.length) % images.length);
	};

	const showNextImage = () => showImage(activeImageIndex + 1);
	const showPreviousImage = () => showImage(activeImageIndex - 1);

	const handleMainImageClick = () => {
		trackHotelView();
	};

	const handleMainImageLinkClick = (event) => {
		if (swipeHandledRef.current) {
			event.preventDefault();
			return;
		}
		handleMainImageClick();
	};

	const handleTouchStart = (event) => {
		const touch = event.touches?.[0];
		if (!touch) return;
		touchStartRef.current = { x: touch.clientX, y: touch.clientY };
	};

	const handleTouchEnd = (event) => {
		const touch = event.changedTouches?.[0];
		if (!touch) return;
		const deltaX = touch.clientX - touchStartRef.current.x;
		const deltaY = touch.clientY - touchStartRef.current.y;
		if (Math.abs(deltaX) < 38 || Math.abs(deltaX) < Math.abs(deltaY)) return;
		swipeHandledRef.current = true;
		window.setTimeout(() => {
			swipeHandledRef.current = false;
		}, 350);
		if (deltaX > 0) {
			isArabic ? showNextImage() : showPreviousImage();
		} else {
			isArabic ? showPreviousImage() : showNextImage();
		}
	};

	return (
		<article className="hotel-card premium-card" dir={isArabic ? "rtl" : "ltr"}>
			<div className="hotel-card-gallery">
				<Link
					className="hotel-card-main-image"
					href={hrefWithLanguage(`/single-hotel/${slug}`)}
					aria-label={isArabic ? "\u0639\u0631\u0636 \u0627\u0644\u0641\u0646\u062f\u0642" : "View hotel"}
					onClick={handleMainImageLinkClick}
					onTouchStart={handleTouchStart}
					onTouchEnd={handleTouchEnd}
				>
					<OptimizedImage
						src={image}
						alt={displayName || "Jannat hotel"}
						fill
						priority={priority}
						quality={66}
						sizes="(max-width: 760px) calc(100vw - 56px), (max-width: 1100px) 42vw, 370px"
						unoptimized={!optimizeImages}
					/>
					<span className="hotel-card-image-dots" aria-hidden="true">
						{images.slice(0, 5).map((item, index) => (
							<i className={index === activeImageIndex ? "active" : ""} key={`${item}-${index}`} />
						))}
					</span>
				</Link>
				<div className="hotel-card-thumbs" aria-label={isArabic ? "\u0635\u0648\u0631 \u0627\u0644\u0641\u0646\u062f\u0642" : "Hotel photos"}>
					{images.slice(0, 4).map((item, index) => (
						<button
							type="button"
							className={index === activeImageIndex ? "active" : ""}
							key={`${item}-thumb-${index}`}
							onClick={() => showImage(index)}
							aria-label={`${isArabic ? "\u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u0631\u0629" : "Show photo"} ${index + 1}`}
						>
							<OptimizedImage
								src={item}
								alt=""
								width={120}
								height={74}
								sizes="90px"
								quality={66}
								unoptimized={!optimizeImages}
							/>
						</button>
					))}
				</div>
			</div>

			<div className="hotel-card-details">
				<div className="hotel-card-title-row">
					<div>
						<h3 lang={language === "ar" ? "ar" : "en"}>
							<Link href={hrefWithLanguage(`/single-hotel/${slug}`)} onClick={trackHotelView}>{displayName}</Link>
						</h3>
						<p className="hotel-card-address">
							<MapPin size={15} />
							{addressLine(hotel)}
						</p>
					</div>
					<span className="hotel-card-brand">Jannat</span>
				</div>

				<div
					className="hotel-card-rating"
					role="img"
					aria-label={
						hasRealRating
							? isArabic
								? `${rating.toFixed(1)} من 5 بناءً على ${ratingCount} ${ratingCount === 1 ? "تقييم" : "تقييمات"} من الضيوف`
								: `${rating.toFixed(1)} out of 5 from ${ratingCount} guest ${ratingCount === 1 ? "rating" : "ratings"}`
							: isArabic
								? `فندق بتقييم ${rating.toFixed(1)} نجوم`
								: `${rating.toFixed(1)} star hotel`
					}
				>
					<span>
						{hasRealRating
							? isArabic
								? "\u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0636\u064a\u0648\u0641"
								: "Guest rating"
							: isArabic
								? "\u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0641\u0646\u062f\u0642"
								: "Hotel rating"}
						{hasRealRating ? (
							<>
								{" "}
								<bdi dir="ltr">{rating.toFixed(1)}</bdi>
								{" \u00b7 "}
								<bdi dir="ltr">{ratingCount}</bdi>{" "}
								{isArabic
									? "\u062a\u0642\u064a\u064a\u0645"
									: ratingCount === 1
										? "rating"
										: "ratings"}
							</>
						) : null}
					</span>
					<div>
						{[0, 1, 2, 3, 4].map((index) => (
							<Star
								key={index}
								size={16}
								fill={index < Math.round(rating) ? "currentColor" : "none"}
							/>
						))}
					</div>
				</div>

				<div className="hotel-card-price">
					{price ? (
						<>
							<strong dir="ltr" className="ltr-value">{formatCurrency(price)}</strong>
							<span>{labels.perNight}</span>
							{oldPrice ? <del dir="ltr" className="ltr-value">{formatCurrency(oldPrice)}</del> : null}
						</>
					) : (
						<strong>{t("contactForPrice")}</strong>
					)}
				</div>

				{visibleFeatures.length ? (
					<div className="hotel-card-amenities">
						{visibleFeatures.map((feature) => {
							const Icon = featureIcon(feature);
							return (
								<span key={feature}>
									<Icon size={14} />
									{titleCase(feature)}
								</span>
							);
						})}
					</div>
				) : null}

				{features.length > 15 ? (
					<button
						type="button"
						className="hotel-card-show-more"
						aria-expanded={amenitiesExpanded}
						onClick={() => setAmenitiesExpanded((current) => !current)}
					>
						{amenitiesExpanded ? labels.showLess : labels.showMore}
					</button>
				) : null}

				<div className="hotel-card-distance-row">
					{walking ? (
						<span className="distance-pill walking">
							<Footprints size={15} />
							<bdi dir="ltr" className="ltr-value">{walking}</bdi> {labels.walkingToHaram}
						</span>
					) : null}
					{showDrivingDistance ? (
						<span className="distance-pill driving">
							<Car size={15} />
							<bdi dir="ltr" className="ltr-value">{driving}</bdi> {labels.drivingToHaram}
						</span>
					) : null}
					<span className="distance-pill rooms">
						<BedDouble size={15} />
						<bdi dir="ltr" className="ltr-value">{roomsCount}</bdi> {roomTypesLabel}
					</span>
				</div>
			</div>

			<aside className="hotel-card-actions">
				<div className="hotel-card-action-spacer" />
				<div className="hotel-card-action-stack">
					<span className="hotel-card-cancel">
						<CheckCircle2 size={15} />
						{labels.freeCancellation}
					</span>
					<button type="button" className="hotel-card-chat" onClick={handleOpenChat}>
						<Headset size={17} />
						<span>{labels.chat}</span>
						<span className="hotel-card-live-dot" aria-hidden="true" />
					</button>
					<Link href={hrefWithLanguage(`/single-hotel/${slug}`)} className="hotel-card-details-link" onClick={trackHotelView}>
						{t("viewHotel")}
						<ArrowRight size={16} />
					</Link>
				</div>
			</aside>
		</article>
	);
}
