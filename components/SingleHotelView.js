"use client";

import { useEffect, useRef, useState } from "react";
import {
	ArrowLeft,
	ArrowRight,
	BedDouble,
	CalendarDays,
	Car,
	Footprints,
	MapPin,
	MessageCircle,
	ShieldCheck,
	Star,
} from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import PaginationControls from "./PaginationControls";
import RoomCard from "./RoomCard";
import { ARABIC_BRAND_NAME, DEFAULT_HERO_IMAGE } from "../lib/constants";
import {
	drivingDistance,
	firstImage,
	hotelLocation,
	isUsableImage,
	stripHtml,
	titleCase,
	walkingDistanceOnly,
} from "../lib/format";
import { roomTypeCountLabel } from "../lib/roomLabels";
import { openJannatSupport } from "../lib/support";
import HeroSkyEffect from "./HeroSkyEffect";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const compactPhotos = (hotel = {}) => {
	const rows = [
		...(Array.isArray(hotel.hotelPhotos) ? hotel.hotelPhotos : []),
		...(hotel.roomCountDetails || []).flatMap((room) => (Array.isArray(room.photos) ? room.photos : [])),
	]
		.map((item) => item?.url || item)
		.filter(isUsableImage);
	return [...new Set(rows)].slice(0, 8);
};

const cleanPhone = (value = "") => String(value || "").replace(/[^\d+]/g, "");
const PAGE_SIZE = 15;

export default function SingleHotelView({ hotel = {}, website = {} }) {
	const { t, isArabic } = useJannatApp();
	const photos = compactPhotos(hotel);
	const [activePhotoIndex, setActivePhotoIndex] = useState(0);
	const [roomPage, setRoomPage] = useState(1);
	const [preloadGallery, setPreloadGallery] = useState(false);
	const touchStartRef = useRef({ x: 0, y: 0 });
	const heroImage =
		photos[activePhotoIndex] ||
		photos[0] ||
		firstImage(hotel.hotelPhotos, hotel.roomCountDetails?.[0]?.photos, DEFAULT_HERO_IMAGE);
	const galleryPhotos = photos.length ? photos : [heroImage].filter(Boolean);
	const hotelName =
		isArabic && hotel.hotelName_OtherLanguage
			? hotel.hotelName_OtherLanguage
			: titleCase(hotel.hotelName);
	const walking = walkingDistanceOnly(hotel);
	const driving = drivingDistance(hotel);
	const showDrivingDistance = driving && driving !== walking;
	const phone = website?.phone || "+1 (909) 222-3374";
	const supportMessage = isArabic
		? `مرحبا ${ARABIC_BRAND_NAME}، أرغب بالاستفسار عن ${hotelName}.`
		: `Hello Jannat Booking, I am interested in ${hotelName}.`;
	const about =
		stripHtml(isArabic ? hotel.aboutHotelArabic || hotel.aboutHotel : hotel.aboutHotel) ||
		(isArabic
			? "فندق يوفر خيارات غرف واضحة وخدمة تساعدك على اختيار الإقامة المناسبة."
			: "A Jannat Booking hotel with clear room choices, guest support, and a stay experience shaped around comfort.");
	const rooms = Array.isArray(hotel.roomCountDetails) ? hotel.roomCountDetails : [];
	const roomCount = rooms.length;
	const roomTypesLabel = roomTypeCountLabel(roomCount, isArabic);
	const rating = Math.max(0, Math.min(5, Number(hotel.hotelRating || 0)));
	const roomTotalPages = Math.max(1, Math.ceil(roomCount / PAGE_SIZE));
	const currentRoomPage = Math.min(roomPage, roomTotalPages);
	const paginatedRooms = rooms.slice(
		(currentRoomPage - 1) * PAGE_SIZE,
		currentRoomPage * PAGE_SIZE
	);

	useEffect(() => {
		trackConversion(
			"viewHotel",
			{
				content_name: hotelName,
				content_type: "hotel",
				item_id: hotel._id,
			},
			["View Hotel Detail"]
		);
	}, [hotel._id, hotelName]);

	useEffect(() => {
		setRoomPage(1);
		setActivePhotoIndex(0);
	}, [hotel._id]);

	useEffect(() => {
		if (activePhotoIndex >= photos.length) setActivePhotoIndex(0);
	}, [activePhotoIndex, photos.length]);

	useEffect(() => {
		setPreloadGallery(false);
		if (photos.length <= 1) return undefined;

		if (typeof window.requestIdleCallback === "function") {
			const handle = window.requestIdleCallback(() => setPreloadGallery(true));
			return () => window.cancelIdleCallback?.(handle);
		}

		const handle = window.setTimeout(() => setPreloadGallery(true), 250);
		return () => window.clearTimeout(handle);
	}, [hotel._id, photos.length]);

	const handleOpenChat = () => {
		trackConversion(
			"lead",
			{ content_name: hotelName, content_type: "hotel", hotel_id: hotel._id },
			["Hotel Detail Chat Lead"]
		);
		openJannatSupport({
			hotel,
			hotelName,
			message: supportMessage,
		});
	};

	const showPhoto = (index) => {
		const count = Math.max(photos.length, 1);
		setActivePhotoIndex((index + count) % count);
	};

	const showNextPhoto = () => showPhoto(activePhotoIndex + (isArabic ? -1 : 1));
	const showPreviousPhoto = () => showPhoto(activePhotoIndex + (isArabic ? 1 : -1));

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
		if (deltaX > 0) showPreviousPhoto();
		else showNextPhoto();
	};

	return (
		<>
			<section className="single-hotel-stage ottoman-hero" dir={isArabic ? "rtl" : "ltr"}>
				<HeroSkyEffect density="compact" />
				<div className="container single-hotel-wrap">
					<div className="single-hotel-gallery-shell">
						<div
							className="single-hotel-main-photo"
							onTouchStart={handleGalleryTouchStart}
							onTouchEnd={handleGalleryTouchEnd}
						>
							{galleryPhotos.map((photo, index) => {
								const isActive = index === activePhotoIndex;
								const shouldRender = preloadGallery || isActive || index === 0;
								if (!shouldRender) return null;
								return (
									<OptimizedImage
										key={`${photo}-main-${index}`}
										className={`single-main-gallery-image${isActive ? " active" : ""}`}
										src={photo}
										alt={isActive ? hotelName : ""}
										aria-hidden={isActive ? undefined : true}
										fill
										priority={index === 0}
										loading={index === 0 ? undefined : "eager"}
										decoding="async"
										sizes="(max-width: 760px) calc(100vw - 24px), 1180px"
									/>
								);
							})}
							{photos.length > 1 ? (
								<div className="single-gallery-controls">
									<button type="button" onClick={showPreviousPhoto} aria-label="Previous photo">
										<ArrowLeft size={18} />
									</button>
									<button type="button" onClick={showNextPhoto} aria-label="Next photo">
										<ArrowRight size={18} />
									</button>
								</div>
							) : null}
							<div className="single-gallery-dots" aria-hidden="true">
								{photos.map((photo, index) => (
									<i className={index === activePhotoIndex ? "active" : ""} key={`${photo}-dot-${index}`} />
								))}
							</div>
						</div>
						{photos.length > 1 ? (
							<div className="single-gallery-thumbs">
								{photos.map((photo, index) => (
									<button
										type="button"
										className={index === activePhotoIndex ? "active" : ""}
										key={`${photo}-thumb-${index}`}
										onClick={() => showPhoto(index)}
										aria-label={`${isArabic ? "عرض الصورة" : "Show photo"} ${index + 1}`}
									>
										<OptimizedImage src={photo} alt="" width={150} height={88} sizes="120px" quality={70} />
									</button>
								))}
							</div>
						) : null}
					</div>

					<div className="single-hotel-summary">
						<div className="single-hotel-summary-copy">
							<div className="single-hotel-rating-row">
								<span className="rating-pill">
									<Star size={16} fill="currentColor" />
									<bdi dir="ltr" className="ltr-value">
										{rating.toFixed(1)}
									</bdi>
								</span>
								<span>{isArabic ? "\u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0641\u0646\u062f\u0642" : "Hotel rating"}</span>
								<div aria-hidden="true">
									{[0, 1, 2, 3, 4].map((index) => (
										<Star
											key={index}
											size={15}
											fill={index < Math.round(rating) ? "currentColor" : "none"}
										/>
									))}
								</div>
							</div>
							<h1>{hotelName}</h1>
							<p className="hotel-address">
								<MapPin size={18} />
								{hotelLocation(hotel) || hotel.hotelAddress || "Saudi Arabia"}
							</p>
						</div>
						<div className="single-hotel-actions">
							<a className="btn btn-primary" href="#rooms">
								<BedDouble size={18} />
								{t("availableRoomTypes")}
							</a>
							<button className="btn btn-metal" type="button" onClick={handleOpenChat}>
								<MessageCircle size={18} />
								{t("askToBook")}
							</button>
						</div>
					</div>

					<div className="single-hotel-facts">
						<span>
							<BedDouble size={17} />
							<bdi dir="ltr" className="ltr-value">
								{roomCount}
							</bdi>{" "}
							{roomTypesLabel}
						</span>
						{walking ? (
							<span>
								<Footprints size={17} />
								<bdi dir="ltr" className="ltr-value">
									{walking}
								</bdi>{" "}
								{isArabic ? "مشيا إلى الحرم" : "walk to Al Haram"}
							</span>
						) : null}
						{showDrivingDistance ? (
							<span>
								<Car size={17} />
								<bdi dir="ltr" className="ltr-value">
									{driving}
								</bdi>{" "}
								{isArabic ? "بالسيارة إلى الحرم" : "drive to Al Haram"}
							</span>
						) : null}
						<span>
							<CalendarDays size={17} />
							{isArabic ? "حجز مرن" : "Flexible booking"}
						</span>
						<span>
							<ShieldCheck size={17} />
							{isArabic ? `دعم ${ARABIC_BRAND_NAME}` : "Jannat Booking support"}
						</span>
					</div>
				</div>
			</section>

			<nav className="hotel-section-nav" dir={isArabic ? "rtl" : "ltr"} aria-label="Hotel sections">
				<div className="container">
					<a href="#overview">{isArabic ? "نظرة عامة" : "Overview"}</a>
					<a href="#about">{isArabic ? "عن الفندق" : "About"}</a>
					<a href="#rooms">{t("rooms")}</a>
					<a href="#location">{isArabic ? "الموقع" : "Location"}</a>
					<a href="#support">{t("support")}</a>
				</div>
			</nav>

			<section className="section hotel-overview-section" id="overview">
				<div className="container hotel-overview-grid" dir={isArabic ? "rtl" : "ltr"}>
					<article className="premium-card hotel-overview-card" id="about">
						<p className="eyebrow">{isArabic ? "عن الفندق" : "About the hotel"}</p>
						<h2>{hotelName}</h2>
						<p>{about}</p>
					</article>
					<aside className="premium-card hotel-facts-card" id="location">
						<p className="eyebrow">{isArabic ? "الموقع والخدمة" : "Location and service"}</p>
						<strong>{hotelLocation(hotel) || hotel.hotelAddress || "Saudi Arabia"}</strong>
						{walking ? (
							<span>
								<bdi dir="ltr" className="ltr-value">
									{walking}
								</bdi>{" "}
								{isArabic ? "مشيا إلى الحرم" : "walk to Al Haram"}
							</span>
						) : null}
						{showDrivingDistance ? (
							<span>
								<bdi dir="ltr" className="ltr-value">
									{driving}
								</bdi>{" "}
								{isArabic ? "بالسيارة إلى الحرم" : "drive to Al Haram"}
							</span>
						) : null}
						<a href={`tel:${cleanPhone(phone)}`} dir="ltr" className="ltr-value">
							{phone}
						</a>
						<button className="btn btn-ghost" type="button" onClick={handleOpenChat}>
							<MessageCircle size={17} />
							{t("askToBook")}
						</button>
					</aside>
				</div>
			</section>

			<section className="section hotel-rooms-section" id="rooms">
				<div className="container hotel-rooms-layout" dir={isArabic ? "rtl" : "ltr"}>
					<div className="section-head">
						<div>
							<p className="eyebrow">{t("rooms")}</p>
							<h2 className="section-title">{t("availableRoomTypes")}</h2>
							<p className="section-copy">{t("availableRoomCopy")}</p>
						</div>
					</div>
					<div className="room-list jannat-room-list">
						{roomCount ? (
							paginatedRooms.map((room, index) => (
								<RoomCard
									key={room._id || room.roomType}
									hotel={hotel}
									room={room}
									priority={index < 2}
								/>
							))
						) : (
							<div className="empty-state">
								{isArabic
									? "لا توجد غرف نشطة متاحة لهذا الفندق حاليا."
									: "No active rooms are available for this hotel yet."}
							</div>
						)}
					</div>
					<PaginationControls
						currentPage={currentRoomPage}
						totalItems={roomCount}
						pageSize={PAGE_SIZE}
						onPageChange={setRoomPage}
					/>
				</div>
			</section>

			<section className="section" id="support">
				<div className="container support-cta premium-card" dir={isArabic ? "rtl" : "ltr"}>
					<div>
						<p className="eyebrow">{t("support")}</p>
						<h2>{isArabic ? "تحتاج مساعدة في اختيار الغرفة؟" : "Need help choosing the right room?"}</h2>
						<p>
							{isArabic
								? `فريق ${ARABIC_BRAND_NAME} يساعدك حسب الفندق والتواريخ ونوع الغرفة المناسب.`
								: "Jannat Booking support can help with hotel-specific room, date, and booking questions."}
						</p>
					</div>
					<button className="btn btn-primary" type="button" onClick={handleOpenChat}>
						<MessageCircle size={18} />
						{t("askToBook")}
					</button>
				</div>
			</section>
		</>
	);
}
