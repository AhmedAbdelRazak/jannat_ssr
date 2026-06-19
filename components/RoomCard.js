"use client";

import Link from "next/link";
import { Button } from "antd";
import { BedDouble, MessageCircle, ShoppingBag } from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import { buildRoomPricing } from "../lib/booking";
import { ARABIC_BRAND_NAME } from "../lib/constants";
import { firstImage, roomTypeLabel, slugifyHotel, titleCase } from "../lib/format";
import { openJannatSupport } from "../lib/support";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const dateOffset = (days) => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
};

export default function RoomCard({
	hotel = {},
	room = {},
	checkIn,
	checkOut,
	adults = 1,
	children = 0,
	priority = false,
}) {
	const { addToCart, t, isArabic, hrefWithLanguage, formatCurrency } = useJannatApp();
	const image = firstImage(room.photos, hotel.hotelPhotos);
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
	const supportMessage = isArabic
		? `مرحبا ${ARABIC_BRAND_NAME}، أرغب بالاستفسار عن ${roomName} في ${hotelName}.`
		: `Hello Jannat Booking, I am interested in ${roomName} at ${hotelName}.`;

	const handleAdd = () => {
		trackConversion(
			"addToCart",
			{
				content_name: roomName,
				content_type: "room",
				item_id: room._id || room.roomType,
				hotel_id: hotel._id,
				value: price || undefined,
				currency: price ? "SAR" : undefined,
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

	return (
		<article className="room-card premium-card" dir={isArabic ? "rtl" : "ltr"}>
			{image ? (
				<Link className="room-card-image" href={hrefWithLanguage(`/single-hotel/${slug}`)}>
					<OptimizedImage
						src={image}
						alt={`${roomName} at ${hotelName}`}
						fill
						priority={priority}
						sizes="(max-width: 760px) calc(100vw - 56px), 360px"
					/>
				</Link>
			) : null}
			<div className="room-content">
				<span className="hotel-kicker">{hotelName}</span>
				<h3>
					<Link href={hrefWithLanguage(`/single-hotel/${slug}`)}>{roomName}</Link>
				</h3>
				<p>
					{(isArabic && room.description_OtherLanguage) || room.description ||
						(isArabic
							? `خيار غرفة مريح مع دعم ${ARABIC_BRAND_NAME} المتاح لمساعدتك في تفاصيل الحجز.`
							: "Comfortable room option with Jannat support available for booking details.")}
				</p>
				<div className="room-meta">
					<strong dir={price ? "ltr" : undefined} className={price ? "ltr-value" : undefined}>{price ? formatCurrency(price) : t("priceOnRequest")}</strong>
					{room.bedsCount ? (
						<small>
							<BedDouble size={14} />
							<bdi dir="ltr" className="ltr-value">{room.bedsCount}</bdi> {isArabic ? "\u0623\u0633\u0631\u0629" : "beds"}
						</small>
					) : null}
				</div>
				<div className="room-actions">
					<Link className="btn btn-ghost" href={hrefWithLanguage(`/single-hotel/${slug}`)}>
						{t("hotelDetails")}
					</Link>
					<Button type="primary" icon={<ShoppingBag size={17} />} onClick={handleAdd}>
						{t("addToCart")}
					</Button>
					<button type="button" className="btn btn-metal" onClick={handleOpenChat}>
						<MessageCircle size={17} />
						{t("askToBook")}
					</button>
				</div>
			</div>
		</article>
	);
}
