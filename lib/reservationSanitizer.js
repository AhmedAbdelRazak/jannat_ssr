const numberOrValue = (value) => {
	const number = Number(value);
	return Number.isFinite(number) ? number : value;
};

const compactObject = (input = {}) =>
	Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== "")
	);

const sanitizePricingRow = (row = {}) =>
	compactObject({
		date: row.date || row.calendarDate,
		calendarDate: row.calendarDate || row.date,
		price: numberOrValue(row.price),
		rootPrice: numberOrValue(row.rootPrice),
		totalPrice: numberOrValue(row.totalPrice),
		totalPriceWithCommission: numberOrValue(row.totalPriceWithCommission),
		totalPriceWithoutCommission: numberOrValue(row.totalPriceWithoutCommission),
	});

const sanitizeRoom = (room = {}) =>
	compactObject({
		id: room.id || room._id,
		_id: room._id,
		room_type: room.room_type || room.roomType,
		roomType: room.roomType || room.room_type,
		displayName: room.displayName || room.name,
		displayName_OtherLanguage: room.displayName_OtherLanguage,
		name: room.name || room.displayName,
		count: numberOrValue(room.count || room.quantity || 1),
		quantity: numberOrValue(room.quantity || room.count || 1),
		chosenPrice: numberOrValue(room.chosenPrice),
		price: numberOrValue(room.price),
		rootPrice: numberOrValue(room.rootPrice),
		totalPrice: numberOrValue(room.totalPrice),
		totalPriceWithCommission: numberOrValue(room.totalPriceWithCommission),
		totalPriceWithoutCommission: numberOrValue(room.totalPriceWithoutCommission),
		pricingByDay: Array.isArray(room.pricingByDay)
			? room.pricingByDay.map(sanitizePricingRow)
			: undefined,
		pricingByDayWithCommission: Array.isArray(room.pricingByDayWithCommission)
			? room.pricingByDayWithCommission.map(sanitizePricingRow)
			: undefined,
	});

const sanitizeHotel = (hotel = {}) =>
	compactObject({
		_id: hotel._id,
		hotelName: hotel.hotelName,
		hotelName_OtherLanguage: hotel.hotelName_OtherLanguage,
		hotelCity: hotel.hotelCity,
		hotelState: hotel.hotelState,
		hotelCountry: hotel.hotelCountry,
		hotelAddress: hotel.hotelAddress,
		distances: hotel.distances,
	});

export const sanitizeReservationForPublicPayment = (reservation) => {
	if (!reservation || typeof reservation !== "object") return null;
	const customer = reservation.customer_details || reservation.customerDetails || {};
	const onsitePaid = reservation.payment_details?.onsite_paid_amount;
	return compactObject({
		_id: reservation._id,
		confirmation_number: reservation.confirmation_number,
		hotelName: reservation.hotelName || reservation.hotelId?.hotelName,
		hotelId: sanitizeHotel(reservation.hotelId || {}),
		customer_details: compactObject({
			name: customer.name || customer.fullName,
		}),
		checkin_date: reservation.checkin_date,
		checkout_date: reservation.checkout_date,
		days_of_residence: numberOrValue(reservation.days_of_residence),
		total_amount: numberOrValue(reservation.total_amount),
		paid_amount: numberOrValue(reservation.paid_amount),
		total_rooms: numberOrValue(reservation.total_rooms),
		reservation_status: reservation.reservation_status,
		advancePayment: compactObject({
			enabled: reservation.advancePayment?.enabled,
			amount: numberOrValue(reservation.advancePayment?.amount),
			amountSAR: numberOrValue(reservation.advancePayment?.amountSAR),
			percentage: numberOrValue(reservation.advancePayment?.percentage),
		}),
		payment_details:
			onsitePaid === undefined
				? undefined
				: {
						onsite_paid_amount: numberOrValue(onsitePaid),
					},
		pickedRoomsType: Array.isArray(reservation.pickedRoomsType)
			? reservation.pickedRoomsType.map(sanitizeRoom)
			: undefined,
		pickedRoomsPricing: Array.isArray(reservation.pickedRoomsPricing)
			? reservation.pickedRoomsPricing.map(sanitizeRoom)
			: undefined,
	});
};

