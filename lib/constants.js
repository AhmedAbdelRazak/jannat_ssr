import { composeEmail } from "./email";

export const BRAND_NAME = "Jannat Booking";
export const ARABIC_BRAND_NAME = "جنات بوكينج";
export const BRAND_URL =
	process.env.NEXT_PUBLIC_SITE_URL || "https://jannatbooking.com";

export const CONTACT_EMAIL = composeEmail("support", "jannatbooking.com");
export const OFFICIAL_EMAIL = CONTACT_EMAIL;
export const PHONE_DISPLAY = "+1 (909) 222-3374";
export const WHATSAPP_NUMBER = "19092223374";
export const FOUNDING_YEAR = "2019";
export const PAYMENT_METHODS = [
	"PayPal",
	"Visa",
	"Mastercard",
	"American Express",
	"credit card",
	"debit card",
];

export const GOOGLE_ANALYTICS_ID =
	process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ||
	process.env.NEXT_PUBLIC_GA_ID ||
	"G-JLRSK1M1N8";

export const FACEBOOK_PIXEL_ID =
	process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || "2176581586072732";

export const DEFAULT_LOGO =
	"https://res.cloudinary.com/infiniteapps/image/upload/v1707282182/janat/1707282182070.png";

export const DEFAULT_HERO_IMAGES = [
	"https://res.cloudinary.com/infiniteapps/image/upload/v1734109765/janat/1734109764527.jpg",
	"https://res.cloudinary.com/infiniteapps/image/upload/v1734109751/janat/1734109751072.jpg",
	"https://res.cloudinary.com/infiniteapps/image/upload/v1734109765/janat/1734109764527.jpg",
];

export const DEFAULT_HERO_IMAGE = DEFAULT_HERO_IMAGES[0];
export const DEFAULT_FOOTER_IMAGE = DEFAULT_HERO_IMAGES[1];

export const ROOM_TYPE_LABELS = {
	standardRooms: "Standard room",
	singleRooms: "Single room",
	doubleRooms: "Double room",
	twinRooms: "Twin room",
	queenRooms: "Queen room",
	kingRooms: "King room",
	tripleRooms: "Triple room",
	quadRooms: "Quad room",
	studioRooms: "Studio",
	suite: "Suite",
	masterSuite: "Master suite",
	familyRooms: "Family room",
	individualBed: "Individual bed",
};
