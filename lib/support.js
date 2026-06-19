export const openJannatSupport = ({ hotel = {}, hotelName = "", message = "", topic = "reserve_room" } = {}) => {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent("jannat:open-support", {
			detail: {
				hotelId: hotel?._id || "",
				hotelName: hotelName || hotel?.hotelName || "",
				topic,
				message,
			},
		})
	);
};
