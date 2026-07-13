const finiteNumber = (value, fallback = 0) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

const imageUrl = (value) =>
	typeof value === "string" ? value : String(value?.url || "");

const isUsableCardImage = (value) => {
	const url = imageUrl(value);
	if (!url) return false;
	return (
		!/(^|\/)(missing|default-room)\.(png|jpe?g|webp)$/i.test(url) &&
		!url.includes("/_fallbacks/")
	);
};

export const hotelCardImages = (hotel = {}, fallbackImage = "") => {
	const candidates = [
		...(Array.isArray(hotel.hotelPhotos) ? hotel.hotelPhotos : []),
		...(hotel.roomCountDetails || []).flatMap((room) =>
			Array.isArray(room?.photos) ? room.photos : []
		),
	];
	const urls = [];
	for (const candidate of candidates) {
		const url = imageUrl(candidate);
		if (isUsableCardImage(url) && !urls.includes(url)) urls.push(url);
		if (urls.length === 5) break;
	}
	if (!urls.length && isUsableCardImage(fallbackImage)) urls.push(fallbackImage);
	return urls;
};

export const hotelCardPrice = (hotel = {}) => {
	const prices = (hotel.roomCountDetails || [])
		.map((room) => finiteNumber(room?.price?.basePrice))
		.filter((price) => price > 0);
	return prices.length ? Math.min(...prices) : 0;
};

export const hotelCardFeatures = (hotel = {}) => {
	const rows = (hotel.roomCountDetails || []).flatMap((room) => [
		...(Array.isArray(room?.amenities) ? room.amenities : []),
		...(Array.isArray(room?.views) ? room.views : []),
		...(Array.isArray(room?.extraAmenities) ? room.extraAmenities : []),
	]);
	return [...new Set(rows.filter(Boolean))];
};

export const compactHotelForCard = (hotel = {}, fallbackImage = "") => {
	const summary = hotel.guestReviewSummary || {};
	return {
		_id: hotel._id,
		hotelName: hotel.hotelName,
		hotelName_OtherLanguage: hotel.hotelName_OtherLanguage,
		hotelAddress: hotel.hotelAddress,
		hotelCity: hotel.hotelCity,
		hotelState: hotel.hotelState,
		hotelCountry: hotel.hotelCountry,
		distances: {
			walkingToElHaram: hotel?.distances?.walkingToElHaram,
			drivingToElHaram: hotel?.distances?.drivingToElHaram,
		},
		hotelRating: finiteNumber(hotel.hotelRating),
		guestReviewSummary: {
			ratingCount: Math.max(0, Math.trunc(finiteNumber(summary.ratingCount))),
			ratingSum: Math.max(0, finiteNumber(summary.ratingSum)),
			averageRating: Math.max(0, finiteNumber(summary.averageRating)),
		},
		cardImages: hotelCardImages(hotel, fallbackImage),
		cardPrice: hotelCardPrice(hotel),
		cardFeatures: hotelCardFeatures(hotel),
		cardRoomCount: Array.isArray(hotel.roomCountDetails)
			? hotel.roomCountDetails.length
			: 0,
	};
};
