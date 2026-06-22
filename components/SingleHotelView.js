"use client";

import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { DatePicker } from "antd";
import {
	ArrowLeft,
	ArrowRight,
	BedDouble,
	CalendarDays,
	Car,
	ExternalLink,
	Footprints,
	MapPin,
	MessageCircle,
	ShieldCheck,
	Star,
} from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import { hotelHasDeals } from "../lib/deals";
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
import HotelDealsSection from "./HotelDealsSection";
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
const DATE_FORMAT = "YYYY-MM-DD";

const dateOffset = (days) => dayjs().add(days, "day").format(DATE_FORMAT);
const asStayDate = (value, fallbackDays = 1) => {
	const date = dayjs(value);
	return date.isValid() ? date.startOf("day") : dayjs().add(fallbackDays, "day").startOf("day");
};

const normalizeStayDates = (checkInValue, checkOutValue) => {
	const today = dayjs().startOf("day");
	const fallbackCheckIn = asStayDate(dateOffset(1), 1);
	let checkIn = asStayDate(checkInValue, 1);
	if (checkIn.isBefore(today)) checkIn = fallbackCheckIn;

	let checkOut = asStayDate(checkOutValue, 4);
	if (!checkOut.isAfter(checkIn)) checkOut = checkIn.add(1, "day");

	return {
		checkIn: checkIn.format(DATE_FORMAT),
		checkOut: checkOut.format(DATE_FORMAT),
	};
};

const datesFromUrl = () => {
	if (typeof window === "undefined") return normalizeStayDates(dateOffset(1), dateOffset(4));
	const params = new URLSearchParams(window.location.search);
	return normalizeStayDates(
		params.get("start_date") || params.get("startDate") || dateOffset(1),
		params.get("end_date") || params.get("endDate") || dateOffset(4)
	);
};

const hotelMapDetails = (hotel = {}, hotelName = "") => {
	const coordinates = Array.isArray(hotel?.location?.coordinates) ? hotel.location.coordinates : [];
	const longitude = Number(coordinates[0]);
	const latitude = Number(coordinates[1]);
	const hasCoordinates =
		Number.isFinite(latitude) &&
		Number.isFinite(longitude) &&
		Math.abs(latitude) <= 90 &&
		Math.abs(longitude) <= 180;
	const fallbackQuery = hotel.hotelAddress || hotelLocation(hotel) || hotelName || "Makkah Saudi Arabia";
	const query = hasCoordinates ? `${latitude},${longitude}` : fallbackQuery;
	const encodedQuery = encodeURIComponent(query);
	return {
		hasMap: Boolean(query),
		embedUrl: `https://www.google.com/maps?q=${encodedQuery}&z=15&output=embed`,
		directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`,
	};
};

export default function SingleHotelView({ hotel = {}, website = {} }) {
	const { t, isArabic } = useJannatApp();
	const photos = compactPhotos(hotel);
	const [activePhotoIndex, setActivePhotoIndex] = useState(0);
	const [roomPage, setRoomPage] = useState(1);
	const [preloadGallery, setPreloadGallery] = useState(false);
	const [roomDates, setRoomDates] = useState(() => normalizeStayDates(dateOffset(1), dateOffset(4)));
	const [activeSection, setActiveSection] = useState("overview");
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
		? `\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645\u060c \u0623\u0631\u063a\u0628 \u0628\u0627\u0644\u062a\u062d\u062f\u062b \u0645\u0639 \u0627\u0644\u0627\u0633\u062a\u0642\u0628\u0627\u0644 \u0628\u062e\u0635\u0648\u0635 ${hotelName}.`
		: `Assalamu alaikum, I would like to chat with reception about ${hotelName}.`;
	const about =
		stripHtml(isArabic ? hotel.aboutHotelArabic || hotel.aboutHotel : hotel.aboutHotel) ||
		(isArabic
			? "فندق يوفر خيارات غرف واضحة وخدمة تساعدك على اختيار الإقامة المناسبة."
			: "A Jannat Booking hotel with clear room choices, guest support, and a stay experience shaped around comfort.");
	const rooms = Array.isArray(hotel.roomCountDetails) ? hotel.roomCountDetails : [];
	const roomCount = rooms.length;
	const roomTypesLabel = roomTypeCountLabel(roomCount, isArabic);
	const rating = Math.max(0, Math.min(5, Number(hotel.hotelRating || 0)));
	const mapDetails = hotelMapDetails(hotel, hotelName);
	const hasDeals = hotelHasDeals(hotel);
	const roomTotalPages = Math.max(1, Math.ceil(roomCount / PAGE_SIZE));
	const currentRoomPage = Math.min(roomPage, roomTotalPages);
	const roomCheckInDate = asStayDate(roomDates.checkIn, 1);
	const roomCheckOutDate = asStayDate(roomDates.checkOut, 4);
	const roomNights = Math.max(1, roomCheckOutDate.diff(roomCheckInDate, "day"));
	const today = dayjs().startOf("day");
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
		setRoomDates(datesFromUrl());
	}, [hotel._id]);

	useEffect(() => {
		if (activePhotoIndex >= photos.length) setActivePhotoIndex(0);
	}, [activePhotoIndex, photos.length]);

	useEffect(() => {
		const sectionIds = ["overview", "location", "rooms", ...(hasDeals ? ["packages"] : []), "support"];
		let frame = 0;

		const updateActiveSection = () => {
			window.cancelAnimationFrame(frame);
			frame = window.requestAnimationFrame(() => {
				const anchorLine = Math.min(180, Math.max(104, window.innerHeight * 0.24));
				let nextActive = sectionIds[0];

				sectionIds.forEach((sectionId) => {
					const element = document.getElementById(sectionId);
					if (!element) return;
					if (element.getBoundingClientRect().top <= anchorLine) {
						nextActive = sectionId;
					}
				});

				const overview = document.getElementById("overview");
				if (nextActive === "location" && overview?.getBoundingClientRect().top > -140) {
					nextActive = "overview";
				}

				setActiveSection((current) => (current === nextActive ? current : nextActive));
			});
		};

		updateActiveSection();
		window.addEventListener("scroll", updateActiveSection, { passive: true });
		window.addEventListener("resize", updateActiveSection);
		return () => {
			window.cancelAnimationFrame(frame);
			window.removeEventListener("scroll", updateActiveSection);
			window.removeEventListener("resize", updateActiveSection);
		};
	}, [hasDeals]);

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

	const syncStayDatesToUrl = (nextDates) => {
		if (typeof window === "undefined") return;
		const url = new URL(window.location.href);
		url.searchParams.set("start_date", nextDates.checkIn);
		url.searchParams.set("end_date", nextDates.checkOut);
		url.searchParams.delete("startDate");
		url.searchParams.delete("endDate");
		window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
	};

	const updateStayDates = (nextDates) => {
		const normalized = normalizeStayDates(nextDates.checkIn, nextDates.checkOut);
		setRoomDates(normalized);
		setRoomPage(1);
		syncStayDatesToUrl(normalized);
	};

	const handleCheckInChange = (date) => {
		if (!date) return;
		const nextCheckIn = date.startOf("day");
		const currentNights = Math.max(1, roomCheckOutDate.diff(roomCheckInDate, "day"));
		const nextCheckOut = roomCheckOutDate.isAfter(nextCheckIn)
			? roomCheckOutDate
			: nextCheckIn.add(currentNights, "day");
		updateStayDates({
			checkIn: nextCheckIn.format(DATE_FORMAT),
			checkOut: nextCheckOut.format(DATE_FORMAT),
		});
	};

	const handleCheckOutChange = (date) => {
		if (!date) return;
		const nextCheckOut = date.isAfter(roomCheckInDate)
			? date
			: roomCheckInDate.add(1, "day");
		updateStayDates({
			checkIn: roomDates.checkIn,
			checkOut: nextCheckOut.format(DATE_FORMAT),
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

	const sectionNavItems = [
		{ id: "overview", label: isArabic ? "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629" : "Overview" },
		{ id: "location", label: isArabic ? "\u0627\u0644\u0645\u0648\u0642\u0639" : "Location" },
		{ id: "rooms", label: t("rooms") },
		...(hasDeals
			? [{ id: "packages", label: isArabic ? "\u0627\u0644\u0639\u0631\u0648\u0636 \u0648\u0627\u0644\u0628\u0627\u0642\u0627\u062a" : "Packages" }]
			: []),
		{ id: "support", label: t("support") },
	];

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
					{sectionNavItems.map((item) => (
						<a
							key={item.id}
							href={`#${item.id}`}
							className={activeSection === item.id ? "is-active" : undefined}
							aria-current={activeSection === item.id ? "true" : undefined}
							onClick={() => setActiveSection(item.id)}
						>
							{item.label}
						</a>
					))}
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
					{mapDetails.hasMap ? (
						<article className="premium-card hotel-map-card">
							<div className="hotel-map-copy">
								<p className="eyebrow">{isArabic ? "\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0645\u0648\u0642\u0639" : "Map location"}</p>
								<h2>{isArabic ? "\u0634\u0627\u0647\u062f \u0645\u0648\u0642\u0639 \u0627\u0644\u0641\u0646\u062f\u0642" : "See the hotel location"}</h2>
								<p>{hotel.hotelAddress || hotelLocation(hotel) || hotelName}</p>
								<a
									className="btn btn-metal"
									href={mapDetails.directionsUrl}
									target="_blank"
									rel="noreferrer"
								>
									<MapPin size={17} />
									{isArabic ? "\u0641\u062a\u062d \u0627\u0644\u0627\u062a\u062c\u0627\u0647\u0627\u062a" : "Open directions"}
									<ExternalLink size={14} />
								</a>
							</div>
							<div className="hotel-map-frame">
								<iframe
									title={`${hotelName} map`}
									src={mapDetails.embedUrl}
									loading="lazy"
									referrerPolicy="no-referrer-when-downgrade"
									allowFullScreen
								/>
							</div>
						</article>
					) : null}
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
						<div
							className="hotel-room-date-panel"
							aria-label={isArabic ? "\u062a\u063a\u064a\u064a\u0631 \u062a\u0648\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0642\u0627\u0645\u0629" : "Change stay dates"}
						>
							<div className="hotel-room-date-copy">
								<span>
									<CalendarDays size={15} />
									{isArabic ? "\u062a\u0648\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0642\u0627\u0645\u0629" : "Stay dates"}
								</span>
								<strong>{isArabic ? "\u063a\u064a\u0631 \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0644\u062d\u0633\u0627\u0628 \u0633\u0639\u0631 \u0627\u0644\u063a\u0631\u0641\u0629" : "Change dates to price the room"}</strong>
							</div>
							<div className="hotel-room-date-fields">
								<div className="hotel-room-date-field">
									<span>{t("checkIn")}</span>
									<DatePicker
										className="hotel-room-date-picker"
										value={roomCheckInDate}
										format={DATE_FORMAT}
										allowClear={false}
										disabledDate={(current) => current && current < today}
										onChange={handleCheckInChange}
										placement={isArabic ? "bottomRight" : "bottomLeft"}
									/>
								</div>
								<div className="hotel-room-date-field">
									<span>{t("checkOut")}</span>
									<DatePicker
										className="hotel-room-date-picker"
										value={roomCheckOutDate}
										format={DATE_FORMAT}
										allowClear={false}
										disabledDate={(current) => current && current <= roomCheckInDate.startOf("day")}
										onChange={handleCheckOutChange}
										placement={isArabic ? "bottomRight" : "bottomLeft"}
									/>
								</div>
								<span className="hotel-room-night-pill">
									<bdi dir="ltr" className="ltr-value">{roomNights}</bdi>
									{roomNights > 1 ? t("nights") : t("night")}
								</span>
							</div>
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
									imageGallery
									checkIn={roomDates.checkIn}
									checkOut={roomDates.checkOut}
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

			{hasDeals ? <HotelDealsSection hotel={hotel} fallbackDates={roomDates} /> : null}

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
