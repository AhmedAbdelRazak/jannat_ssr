export const clientPaymentHotelName = (reservation = {}) =>
	String(
		reservation?.hotelName ||
			reservation?.hotelId?.hotelName ||
			"Jannat Booking"
	).trim() || "Jannat Booking";
