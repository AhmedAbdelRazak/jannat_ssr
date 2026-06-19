import { redirect } from "next/navigation";

export default async function OurHotelsRoomsRedirect({ searchParams }) {
	const params = await searchParams;
	const nextParams = new URLSearchParams();

	Object.entries(params || {}).forEach(([key, value]) => {
		if (Array.isArray(value)) {
			value.forEach((item) => nextParams.append(key, item));
			return;
		}
		if (value !== undefined && value !== null) nextParams.set(key, value);
	});

	const query = nextParams.toString();
	redirect(`/rooms${query ? `?${query}` : ""}`);
}
