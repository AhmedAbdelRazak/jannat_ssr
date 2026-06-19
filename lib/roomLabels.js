export const roomTypeCountLabel = (count = 0, isArabic = false) => {
	const total = Number(count || 0);
	if (isArabic) return total === 1 ? "\u0646\u0648\u0639 \u063a\u0631\u0641\u0629" : "\u0623\u0646\u0648\u0627\u0639 \u063a\u0631\u0641";
	return total === 1 ? "room type" : "room types";
};
