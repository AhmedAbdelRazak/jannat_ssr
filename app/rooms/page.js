import PageHero from "../../components/PageHero";
import PaginationControls from "../../components/PaginationControls";
import RoomCard from "../../components/RoomCard";
import RoomsResultsHead from "../../components/RoomsResultsHead";
import SearchPanel from "../../components/SearchPanel";
import { getHotels, getRoomSearchResults, getRoomTypes, getWebsite } from "../../lib/api";
import { ARABIC_BRAND_NAME, BRAND_NAME, DEFAULT_HERO_IMAGE } from "../../lib/constants";

export const metadata = {
	title: "Room Search",
	description: `Search room availability and prices across ${BRAND_NAME} hotels.`,
	openGraph: { images: [DEFAULT_HERO_IMAGE] },
	alternates: { canonical: "/rooms" },
};

const todayOffset = (days) => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
};
const PAGE_SIZE = 15;
const firstParam = (value, fallback = "") => (Array.isArray(value) ? value[0] || fallback : value || fallback);
const parsePage = (value) => {
	const page = Number.parseInt(firstParam(value, "1"), 10);
	return Number.isFinite(page) && page > 0 ? page : 1;
};

export default async function RoomsPage({ searchParams }) {
	const params = await searchParams;
	const destination = firstParam(params?.destination, "All");
	const startDate = firstParam(params?.startDate, todayOffset(1));
	const endDate = firstParam(params?.endDate, todayOffset(4));
	const roomType = firstParam(params?.roomType, "all");
	const adults = firstParam(params?.adults, "1");
	const children = firstParam(params?.children, "");
	const requestedPage = parsePage(params?.page);
	const hasSearch = Boolean(params?.startDate || params?.endDate || params?.destination || params?.roomType);
	const query = `${startDate}_${endDate}_${roomType}_${adults}_${children}_${destination}`;
	const [hotels, roomTypes, website] = await Promise.all([getHotels(), getRoomTypes(), getWebsite()]);
	const results = hasSearch ? await getRoomSearchResults(query) : hotels;
	const roomRows = [];

	results.forEach((hotel) => {
		(hotel.roomCountDetails || []).forEach((room) => {
			roomRows.push({ hotel, room });
		});
	});
	const totalPages = Math.max(1, Math.ceil(roomRows.length / PAGE_SIZE));
	const currentPage = Math.min(requestedPage, totalPages);
	const paginatedRoomRows = roomRows.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE
	);
	const paginationQuery = {
		...(params || {}),
		destination,
		startDate,
		endDate,
		roomType,
		adults,
		children,
	};
	delete paginationQuery.page;

	return (
		<>
			<PageHero
				eyebrow="Room search"
				title="Find the right room for your dates"
				copy="Search Jannat Booking hotels by destination, dates, room type, and guest count."
				eyebrowAr="بحث الغرف"
				titleAr="ابحث عن الغرفة المناسبة لتواريخك"
				copyAr={`ابحث في فنادق ${ARABIC_BRAND_NAME} حسب الوجهة والتواريخ ونوع الغرفة وعدد الضيوف.`}
			/>
			<section className="search-band page-search-band">
				<div className="container">
					<SearchPanel
						hotels={hotels}
						roomTypes={roomTypes}
						compact
						defaults={{ destination, startDate, endDate, roomType, adults, children }}
					/>
				</div>
			</section>
			<section className="section">
				<div className="container page-stack">
					<RoomsResultsHead
						count={roomRows.length}
						destination={destination}
						startDate={startDate}
						endDate={endDate}
					/>
					{roomRows.length ? (
						<>
						<div className="room-list">
							{paginatedRoomRows.map(({ hotel, room }, index) => (
								<RoomCard
									key={`${hotel._id}-${room._id || room.roomType}`}
									hotel={hotel}
									room={room}
									priority={index < 2}
									whatsappNumber={website?.whatsappNumber}
									checkIn={startDate}
									checkOut={endDate}
									adults={adults}
									children={children || "0"}
								/>
							))}
						</div>
						<PaginationControls
							currentPage={currentPage}
							totalItems={roomRows.length}
							pageSize={PAGE_SIZE}
							basePath="/rooms"
							query={paginationQuery}
						/>
						</>
					) : (
						<div className="empty-state">
							No room options matched this search yet. Try a wider date range or another destination.
						</div>
					)}
				</div>
			</section>
		</>
	);
}
