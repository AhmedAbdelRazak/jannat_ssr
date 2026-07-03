const DEFAULT_JANNAT_SUPPORT_VIRTUAL_HOTEL_IDS = [
	"674cf8997e3780f1f838d458",
	"66b6d8698ca02cb39522b85b",
];

const DEFAULT_JANNAT_SUPPORTER_ID = "6553f1c6d06c5cea2f98a838";

const normalizeId = (value = "") =>
	String(value?._id || value?.id || value || "")
		.trim()
		.toLowerCase();

const splitIds = (...values) =>
	values
		.flatMap((value) => String(value || "").split(","))
		.map(normalizeId)
		.filter(Boolean);

const uniqueIds = (ids = []) => [...new Set(ids.map(normalizeId).filter(Boolean))];

export const getJannatSupportConfig = () => {
	const virtualHotelIds = uniqueIds([
		...DEFAULT_JANNAT_SUPPORT_VIRTUAL_HOTEL_IDS,
		...splitIds(
			process.env.JANNATSUPPORT_VIRTUAL_HOTEL_IDS,
			process.env.JANNAT_BOOKING_SUPPORT_HOTEL_ID,
			process.env.REACT_APP_JANNAT_BOOKING_SUPPORT_HOTEL_ID,
			process.env.NEXT_PUBLIC_JANNAT_BOOKING_SUPPORT_HOTEL_ID,
			process.env.JANNAT_SUPPORT_HOTEL_IDS
		),
	]);
	return {
		supportHotelId:
			normalizeId(
				process.env.NEXT_PUBLIC_JANNAT_BOOKING_SUPPORT_HOTEL_ID ||
					process.env.JANNAT_BOOKING_SUPPORT_HOTEL_ID
			) || virtualHotelIds[0],
		supporterId:
			normalizeId(
				process.env.NEXT_PUBLIC_JANNAT_BOOKING_SUPPORTER_ID ||
					process.env.JANNAT_BOOKING_SUPPORTER_ID ||
					process.env.JANNAT_SUPPORTER_ID
			) || DEFAULT_JANNAT_SUPPORTER_ID,
		virtualHotelIds,
	};
};

export const isVirtualJannatSupportHotelId = (hotelId = "", config = {}) =>
	(config.virtualHotelIds || DEFAULT_JANNAT_SUPPORT_VIRTUAL_HOTEL_IDS).includes(
		normalizeId(hotelId)
	);
