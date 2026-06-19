import dayjs from "dayjs";

export const safeNumber = (value, fallback = 0) => {
	if (value === "" || value === null || value === undefined) return fallback;
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
};

export const normalizeDate = (value) => dayjs(value).format("YYYY-MM-DD");

export const generateDateRange = (startDate, endDate) => {
	const start = dayjs(startDate);
	const end = dayjs(endDate);
	const dates = [];
	if (!start.isValid() || !end.isValid() || !start.isBefore(end)) return dates;
	let cursor = start;
	while (cursor.isBefore(end)) {
		dates.push(cursor.format("YYYY-MM-DD"));
		cursor = cursor.add(1, "day");
	}
	return dates;
};

export const calculatePricingByDay = (room = {}, startDate, endDate) => {
	const basePrice = safeNumber(room?.price?.basePrice, 0);
	const defaultCost = safeNumber(room?.defaultCost, basePrice);
	const roomCommission = safeNumber(room?.roomCommission, 10) / 100;
	const rates = Array.isArray(room?.pricingRate) ? room.pricingRate : [];

	return generateDateRange(startDate, endDate).map((date) => {
		const rate = rates.find((row) => String(row?.calendarDate || "").slice(0, 10) === date);
		const price = safeNumber(rate?.price, basePrice);
		const rootPrice = safeNumber(rate?.rootPrice, defaultCost || price);
		const commissionRate =
			rate?.commissionRate !== undefined && rate?.commissionRate !== null
				? safeNumber(rate.commissionRate, roomCommission * 100) / 100
				: roomCommission;
		const totalPriceWithCommission = Number((price + rootPrice * commissionRate).toFixed(2));
		return {
			date,
			price,
			rootPrice,
			commissionRate,
			totalPriceWithoutCommission: price,
			totalPriceWithCommission,
		};
	});
};

export const buildRoomPricing = (room = {}, startDate, endDate) => {
	const pricingByDay = calculatePricingByDay(room, startDate, endDate);
	return {
		pricingByDay,
		pricingByDayWithCommission: pricingByDay,
	};
};

export const itemNightlyRows = (item = {}) => {
	if (Array.isArray(item.pricingByDayWithCommission) && item.pricingByDayWithCommission.length) {
		return item.pricingByDayWithCommission;
	}
	return generateDateRange(item.checkIn, item.checkOut).map((date) => ({
		date,
		price: safeNumber(item.price, 0),
		rootPrice: safeNumber(item.defaultCost, item.price),
		commissionRate: safeNumber(item.roomCommission, 10) / 100,
		totalPriceWithoutCommission: safeNumber(item.price, 0),
		totalPriceWithCommission: safeNumber(item.price, 0),
	}));
};

export const itemTotal = (item = {}, { payInHotel = false } = {}) => {
	const quantity = Math.max(1, safeNumber(item.amount, 1));
	const multiplier = payInHotel ? 1.1 : 1;
	return itemNightlyRows(item).reduce(
		(total, row) => total + safeNumber(row.totalPriceWithCommission, item.price) * quantity * multiplier,
		0
	);
};

export const cartTotal = (cart = [], options = {}) =>
	cart.reduce((total, item) => total + itemTotal(item, options), 0);

export const cartRoomsCount = (cart = []) =>
	cart.reduce((total, item) => total + Math.max(1, safeNumber(item.amount, 1)), 0);

export const legacyDepositAmount = (cart = []) => {
	let totalCommission = 0;
	let rootPriceFirstDaySum = 0;
	cart.forEach((item) => {
		const quantity = Math.max(1, safeNumber(item.amount, 1));
		itemNightlyRows(item).forEach((row, index) => {
			const rootPrice = safeNumber(row.rootPrice, item.defaultCost || item.price);
			const commissionRate = safeNumber(row.commissionRate, safeNumber(item.roomCommission, 10) / 100);
			const totalPriceWithoutCommission = safeNumber(row.price, item.price);
			totalCommission += (rootPrice * commissionRate + (totalPriceWithoutCommission - rootPrice)) * quantity;
			if (index === 0) rootPriceFirstDaySum += rootPrice * quantity;
		});
	});
	return Number((totalCommission + rootPriceFirstDaySum).toFixed(2));
};

export const transformCartToPickedRoomsType = (cart = [], { payInHotel = false } = {}) =>
	cart.flatMap((item) =>
		Array.from({ length: Math.max(1, safeNumber(item.amount, 1)) }, () => {
			const pricingByDay = itemNightlyRows(item).map((row) => {
				const base = safeNumber(row.totalPriceWithCommission, item.price);
				const totalPriceWithCommission = Number((base * (payInHotel ? 1.1 : 1)).toFixed(2));
				return {
					date: row.date,
					price: safeNumber(row.price, item.price),
					rootPrice: safeNumber(row.rootPrice, item.defaultCost || item.price),
					commissionRate: safeNumber(row.commissionRate, 0),
					totalPriceWithCommission,
					totalPriceWithoutCommission: safeNumber(row.totalPriceWithoutCommission, row.price),
				};
			});
			const totalPriceWithCommission = pricingByDay.reduce(
				(sum, row) => sum + safeNumber(row.totalPriceWithCommission, 0),
				0
			);
			const chosenPrice = pricingByDay.length ? totalPriceWithCommission / pricingByDay.length : 0;
			return {
				room_type: item.roomType,
				displayName: item.roomName,
				chosenPrice: chosenPrice.toFixed(2),
				count: 1,
				pricingByDay,
				roomColor: item.roomColor || "",
				totalPriceWithCommission,
				hotelShouldGet: pricingByDay.reduce((sum, row) => sum + safeNumber(row.rootPrice, 0), 0),
				fromPackagesOffers: Boolean(item.fromPackagesOffers),
				lockDates: Boolean(item.lockDates || item.datesLocked),
				datesLocked: Boolean(item.lockDates || item.datesLocked),
				packageMeta: item.packageMeta || null,
			};
		})
	);

export const defaultGuestPaymentAcceptance = {
	acceptDeposit: true,
	acceptPayWholeAmount: true,
	acceptReserveNowPayInHotel: false,
};
