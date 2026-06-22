"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button, Modal } from "antd";
import {
	ArrowUpRight,
	BedDouble,
	CalendarDays,
	Car,
	ChevronLeft,
	ChevronRight,
	CheckCircle2,
	MapPin,
	MessageCircle,
	Moon,
	ShoppingBag,
	Sparkles,
	Star,
	UsersRound,
} from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import { buildRoomPricing, safeNumber } from "../lib/booking";
import { ARABIC_BRAND_NAME, DEFAULT_HERO_IMAGE } from "../lib/constants";
import {
	drivingDistance,
	firstImage,
	hotelLocation,
	isUsableImage,
	roomTypeLabel,
	slugifyHotel,
	stripHtml,
	titleCase,
	walkingDistanceOnly,
} from "../lib/format";
import { openJannatSupport } from "../lib/support";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const dateOffset = (days) => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
};

const uniqueRoomFeatures = (room = {}) =>
	[
		...(Array.isArray(room.amenities) ? room.amenities : []),
		...(Array.isArray(room.views) ? room.views : []),
		...(Array.isArray(room.extraAmenities) ? room.extraAmenities : []),
	]
		.map((feature) => String(feature || "").trim())
		.filter(Boolean)
		.filter((feature, index, items) => items.indexOf(feature) === index);

const roomGalleryImages = (room = {}, fallbackImage = "") => {
	const photos = Array.isArray(room.photos) ? room.photos : [];
	const urls = photos
		.map((item) => item?.url || item)
		.filter(isUsableImage);
	if (fallbackImage) urls.push(fallbackImage);
	return [...new Set(urls)].slice(0, 12);
};

export default function RoomCard({
	hotel = {},
	room = {},
	checkIn,
	checkOut,
	adults = 1,
	children = 0,
	priority = false,
	imageGallery = false,
}) {
	const { addToCart, t, isArabic, hrefWithLanguage, formatCurrency } = useJannatApp();
	const [isGalleryOpen, setIsGalleryOpen] = useState(false);
	const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
	const touchStartRef = useRef({ x: 0, y: 0 });
	const image = firstImage(room.photos, hotel.hotelPhotos, DEFAULT_HERO_IMAGE);
	const galleryImages = roomGalleryImages(room, image);
	const activeGalleryImage = galleryImages[activeGalleryIndex] || galleryImages[0] || image;
	const roomName =
		isArabic && room.displayName_OtherLanguage
			? room.displayName_OtherLanguage
			: room.displayName || roomTypeLabel(room.roomType);
	const hotelName =
		isArabic && hotel.hotelName_OtherLanguage
			? hotel.hotelName_OtherLanguage
			: titleCase(hotel.hotelName);
	const slug = slugifyHotel(hotel.hotelName);
	const price = Number(room?.price?.basePrice || 0);
	const selectedCheckIn = checkIn || dateOffset(1);
	const selectedCheckOut = checkOut || dateOffset(4);
	const pricing = buildRoomPricing(room, selectedCheckIn, selectedCheckOut);
	const pricingRows = pricing.pricingByDayWithCommission || pricing.pricingByDay || [];
	const nights = Math.max(1, pricingRows.length || 1);
	const totalStayPrice = pricingRows.reduce(
		(total, row) => total + safeNumber(row.totalPriceWithCommission, row.price),
		0
	);
	const nightlyRate = totalStayPrice > 0 ? totalStayPrice / nights : price;
	const comparisonNightlyRate = nightlyRate > 0 ? Math.ceil(nightlyRate * 1.15) : 0;
	const location = hotelLocation(hotel);
	const walking = walkingDistanceOnly(hotel);
	const driving = drivingDistance(hotel);
	const distance = walking || driving;
	const isMadinah = String(`${hotel.hotelCity || ""} ${hotel.hotelState || ""}`)
		.toLowerCase()
		.includes("madinah");
	const distanceTarget = isArabic
		? isMadinah
			? "\u0625\u0644\u0649 \u0627\u0644\u0645\u0633\u062c\u062f \u0627\u0644\u0646\u0628\u0648\u064a"
			: "\u0625\u0644\u0649 \u0627\u0644\u062d\u0631\u0645"
		: isMadinah
			? "to the Prophet's Mosque"
			: "to Al Haram";
	const rating = Math.max(0, Math.min(5, Number(hotel.hotelRating || 0)));
	const roundedRating = Math.round(rating);
	const visibleFeatures = uniqueRoomFeatures(room).slice(0, 4);
	const description = stripHtml(
		(isArabic && room.description_OtherLanguage) || room.description ||
			(isArabic
				? `\u062e\u064a\u0627\u0631 \u063a\u0631\u0641\u0629 \u0645\u0631\u064a\u062d \u0645\u0639 \u062f\u0639\u0645 ${ARABIC_BRAND_NAME} \u0627\u0644\u0645\u062a\u0627\u062d \u0644\u0645\u0633\u0627\u0639\u062f\u062a\u0643 \u0641\u064a \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062d\u062c\u0632.`
				: "Comfortable room option with Jannat support available for booking details.")
	);
	const labels = isArabic
		? {
				available: "\u0645\u062a\u0627\u062d",
				perNight: "\u0644\u0644\u064a\u0644\u0629",
				stayTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u0642\u0627\u0645\u0629",
				specialRate: "\u0633\u0639\u0631 \u062e\u0627\u0635",
				guests: "\u0636\u064a\u0648\u0641",
				beds: "\u0623\u0633\u0631\u0629",
				details: imageGallery ? "\u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u0631" : "\u0639\u0631\u0636 \u0627\u0644\u0641\u0646\u062f\u0642",
				picked: "\u064a\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062a\u0648\u0641\u0631 \u0645\u0639 \u0627\u0644\u0637\u0644\u0628",
			}
		: {
				available: "Available",
				perNight: "per night",
				stayTotal: "Stay total",
				specialRate: "Special rate",
				guests: "guests",
				beds: "beds",
				details: imageGallery ? "View photos" : "View hotel",
				picked: "Availability confirmed with your request",
			};
	const supportMessage = isArabic
		? `\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645 ${ARABIC_BRAND_NAME}\u060c \u0623\u0631\u063a\u0628 \u0628\u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u0639\u0646 ${roomName} \u0641\u064a ${hotelName}.`
		: `Assalamu alaikum Jannat Booking, I am interested in ${roomName} at ${hotelName}.`;

	const handleAdd = () => {
		trackConversion(
			"addToCart",
			{
				content_name: roomName,
				content_type: "room",
				item_id: room._id || room.roomType,
				hotel_id: hotel._id,
				value: nightlyRate || price || undefined,
				currency: nightlyRate || price ? "SAR" : undefined,
			},
			["Add Room To Cart"]
		);
		addToCart({
			id: room._id || `${hotel._id}-${room.roomType}`,
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
			defaultCost: room.defaultCost,
			roomCommission: room.roomCommission,
			pricingRate: Array.isArray(room.pricingRate) ? room.pricingRate : [],
			bedsCount: room.bedsCount,
			adults: Number(adults || 1),
			children: Number(children || 0),
			photos: Array.isArray(room.photos) ? room.photos : [],
			image,
			price,
			amount: 1,
			checkIn: selectedCheckIn,
			checkOut: selectedCheckOut,
			...pricing,
		});
	};

	const handleOpenChat = () => {
		trackConversion(
			"lead",
			{ content_name: roomName, content_type: "room", hotel_id: hotel._id },
			["Room Chat Lead"]
		);
		openJannatSupport({
			hotel,
			hotelName,
			message: supportMessage,
		});
	};

	const showGalleryImage = (index) => {
		if (!galleryImages.length) return;
		setActiveGalleryIndex((index + galleryImages.length) % galleryImages.length);
	};

	const openGallery = () => {
		if (!imageGallery || !galleryImages.length) return;
		setActiveGalleryIndex(0);
		setIsGalleryOpen(true);
		trackConversion(
			"viewContent",
			{ content_name: roomName, content_type: "room_gallery", hotel_id: hotel._id },
			["Room Gallery Open"]
		);
	};

	const handleGalleryTouchStart = (event) => {
		const touch = event.touches?.[0];
		if (!touch) return;
		touchStartRef.current = { x: touch.clientX, y: touch.clientY };
	};

	const handleGalleryTouchEnd = (event) => {
		const touch = event.changedTouches?.[0];
		if (!touch) return;
		const deltaX = touch.clientX - touchStartRef.current.x;
		const deltaY = touch.clientY - touchStartRef.current.y;
		if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) return;
		if (deltaX > 0) showGalleryImage(activeGalleryIndex + (isArabic ? -1 : 1));
		else showGalleryImage(activeGalleryIndex + (isArabic ? 1 : -1));
	};

	const imageContent = (
		<>
			<OptimizedImage
				src={image}
				alt={`${roomName} at ${hotelName}`}
				fill
				priority={priority}
				sizes="(max-width: 760px) calc(100vw - 56px), 390px"
			/>
			<span className="room-status-badge">
				<CheckCircle2 size={15} />
				{labels.available}
			</span>
			{location ? (
				<span className="room-image-location">
					<MapPin size={14} />
					{location}
				</span>
			) : null}
			{imageGallery && galleryImages.length > 1 ? (
				<span className="room-gallery-count" aria-hidden="true">
					<bdi dir="ltr" className="ltr-value">1 / {galleryImages.length}</bdi>
				</span>
			) : null}
		</>
	);

	return (
		<article className="room-card premium-card" dir={isArabic ? "rtl" : "ltr"}>
			{imageGallery ? (
				<button
					type="button"
					className="room-card-image room-card-image-button"
					onClick={openGallery}
					aria-label={isArabic ? "\u0639\u0631\u0636 \u0635\u0648\u0631 \u0627\u0644\u063a\u0631\u0641\u0629" : `Open ${roomName} photos`}
				>
					{imageContent}
				</button>
			) : (
				<Link className="room-card-image" href={hrefWithLanguage(`/single-hotel/${slug}`)}>
					{imageContent}
				</Link>
			)}
			<div className="room-content">
				<div className="room-main">
					<div className="room-title-row">
						<Link
							className="hotel-kicker"
							href={hrefWithLanguage(`/single-hotel/${slug}`)}
							aria-label={isArabic ? `\u0639\u0631\u0636 ${hotelName}` : `View ${hotelName}`}
						>
							<MapPin size={14} />
							<span>{hotelName}</span>
						</Link>
						{rating ? (
							<span className="room-rating" aria-label={`${rating.toFixed(1)} star hotel`}>
								{Array.from({ length: 5 }, (_, index) => (
									<Star
										key={index}
										size={13}
										className={index < roundedRating ? "is-active" : ""}
										fill={index < roundedRating ? "currentColor" : "none"}
									/>
								))}
							</span>
						) : null}
					</div>
					<h3>
						<Link href={hrefWithLanguage(`/single-hotel/${slug}`)}>{roomName}</Link>
					</h3>
					<p className="room-description">{description}</p>
					<div className="room-feature-strip">
						<span>
							<CalendarDays size={14} />
							<bdi dir="ltr" className="ltr-value">{selectedCheckIn} - {selectedCheckOut}</bdi>
						</span>
						<span>
							<Moon size={14} />
							<bdi dir="ltr" className="ltr-value">{nights}</bdi> {nights > 1 ? t("nights") : t("night")}
						</span>
						{room.bedsCount ? (
							<span>
								<BedDouble size={14} />
								<bdi dir="ltr" className="ltr-value">{room.bedsCount}</bdi> {labels.beds}
							</span>
						) : null}
						<span>
							<UsersRound size={14} />
							<bdi dir="ltr" className="ltr-value">{Number(adults || 1) + Number(children || 0)}</bdi> {labels.guests}
						</span>
						{distance ? (
							<span>
								<Car size={14} />
								<bdi dir="ltr" className="ltr-value">{distance}</bdi> {distanceTarget}
							</span>
						) : null}
					</div>
					{visibleFeatures.length ? (
						<div className="room-amenity-chips">
							{visibleFeatures.map((feature) => (
								<span key={feature}>
									<Sparkles size={12} />
									{feature}
								</span>
							))}
						</div>
					) : null}
				</div>
				<aside
					className="room-booking-panel"
					aria-label={isArabic ? "\u062e\u064a\u0627\u0631\u0627\u062a \u062d\u062c\u0632 \u0627\u0644\u063a\u0631\u0641\u0629" : "Room booking options"}
				>
					<div className="room-price-block">
						<span className="room-price-eyebrow">{labels.specialRate}</span>
						{comparisonNightlyRate ? (
							<del dir="ltr" className="ltr-value">{formatCurrency(comparisonNightlyRate)}</del>
						) : null}
						<strong dir={nightlyRate ? "ltr" : undefined} className={nightlyRate ? "ltr-value" : undefined}>
							{nightlyRate ? formatCurrency(nightlyRate) : t("priceOnRequest")}
						</strong>
						<small>{labels.perNight}</small>
						{totalStayPrice ? (
							<span className="room-stay-total">
								{labels.stayTotal}
								<b dir="ltr" className="ltr-value">{formatCurrency(totalStayPrice)}</b>
							</span>
						) : null}
					</div>
					<div className="room-actions">
						<Button type="primary" icon={<ShoppingBag size={17} />} onClick={handleAdd}>
							{t("addToCart")}
						</Button>
						<button type="button" className="btn btn-metal" onClick={handleOpenChat}>
							<MessageCircle size={17} />
							{t("askToBook")}
						</button>
						{imageGallery ? (
							<button type="button" className="btn btn-ghost" onClick={openGallery}>
								{labels.details}
								<ArrowUpRight size={15} />
							</button>
						) : (
							<Link className="btn btn-ghost" href={hrefWithLanguage(`/single-hotel/${slug}`)}>
								{labels.details}
								<ArrowUpRight size={15} />
							</Link>
						)}
					</div>
					<p className="room-booking-note">
						<CheckCircle2 size={14} />
						{labels.picked}
					</p>
				</aside>
			</div>
			{imageGallery ? (
				<Modal
					open={isGalleryOpen}
					onCancel={() => setIsGalleryOpen(false)}
					footer={null}
					centered
					width={1040}
					style={{ maxWidth: "calc(100vw - 24px)" }}
					className="room-gallery-modal"
					styles={{ body: { padding: 0 } }}
					destroyOnHidden
					aria-label={isArabic ? "\u0645\u0639\u0631\u0636 \u0635\u0648\u0631 \u0627\u0644\u063a\u0631\u0641\u0629" : "Room photo gallery"}
				>
					<div className="room-gallery-viewer" dir={isArabic ? "rtl" : "ltr"}>
						<div className="room-gallery-head">
							<div>
								<span>{hotelName}</span>
								<strong>{roomName}</strong>
							</div>
							<bdi dir="ltr" className="room-gallery-counter">
								{activeGalleryIndex + 1} / {galleryImages.length}
							</bdi>
						</div>
						<div
							className="room-gallery-stage"
							onTouchStart={handleGalleryTouchStart}
							onTouchEnd={handleGalleryTouchEnd}
						>
							{activeGalleryImage ? (
								<OptimizedImage
									src={activeGalleryImage}
									alt={`${roomName} photo ${activeGalleryIndex + 1}`}
									fill
									sizes="min(1040px, 100vw)"
									quality={80}
								/>
							) : null}
							{galleryImages.length > 1 ? (
								<>
									<button
										type="button"
										className="room-gallery-arrow previous"
										onClick={() => showGalleryImage(activeGalleryIndex - 1)}
										aria-label={isArabic ? "\u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629" : "Previous photo"}
									>
										<ChevronLeft size={22} />
									</button>
									<button
										type="button"
										className="room-gallery-arrow next"
										onClick={() => showGalleryImage(activeGalleryIndex + 1)}
										aria-label={isArabic ? "\u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629" : "Next photo"}
									>
										<ChevronRight size={22} />
									</button>
								</>
							) : null}
						</div>
						{galleryImages.length > 1 ? (
							<div className="room-gallery-thumbnails" aria-label={isArabic ? "\u0635\u0648\u0631 \u0627\u0644\u063a\u0631\u0641\u0629" : "Room photo thumbnails"}>
								{galleryImages.map((photo, index) => (
									<button
										type="button"
										key={`${photo}-${index}`}
										className={index === activeGalleryIndex ? "active" : ""}
										onClick={() => showGalleryImage(index)}
										aria-label={`${isArabic ? "\u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u0631\u0629" : "Show photo"} ${index + 1}`}
									>
										<OptimizedImage src={photo} alt="" width={132} height={82} sizes="96px" quality={70} />
									</button>
								))}
							</div>
						) : null}
					</div>
				</Modal>
			) : null}
		</article>
	);
}
