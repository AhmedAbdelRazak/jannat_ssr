/** @type {import('next').NextConfig} */
const nextConfig = {
	poweredByHeader: false,
	reactStrictMode: true,
	devIndicators: false,
	images: {
		formats: ["image/webp"],
		minimumCacheTTL: 31536000,
		qualities: [66, 68, 70, 72, 75, 78, 80],
		deviceSizes: [320, 360, 384, 414, 512, 640, 750, 828, 1080, 1200, 1440, 1920],
		imageSizes: [32, 48, 64, 96, 120, 180, 256, 384],
		localPatterns: [
			{ pathname: "/assets/**", search: "" },
			{ pathname: "/assets/**", search: "?v=zad-ajyad-20260712" },
			{ pathname: "/destinations/**", search: "" },
		],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "jannatbooking.com",
				pathname: "/assets/**",
			},
			{
				protocol: "https",
				hostname: "www.jannatbooking.com",
				pathname: "/assets/**",
			},
			{
				protocol: "https",
				hostname: "res.cloudinary.com",
				pathname: "/infiniteapps/image/upload/**",
			},
			{
				protocol: "https",
				hostname: "assets.zyrosite.com",
				pathname: "/**",
			},
		],
	},
	async headers() {
		const imageSecurityHeaders = [
			{ key: "Cross-Origin-Resource-Policy", value: "same-origin" },
			{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
			{ key: "X-Content-Type-Options", value: "nosniff" },
			{ key: "X-Robots-Tag", value: "noindex, noimageindex" },
		];

		return [
			{
				source: "/_next/image",
				headers: imageSecurityHeaders,
			},
			{
				source: "/assets/:path*",
				headers: [
					...imageSecurityHeaders,
					{ key: "Cache-Control", value: "public, max-age=31536000, immutable" },
				],
			},
			{
				source: "/flags/:path*",
				headers: [
					{ key: "Cross-Origin-Resource-Policy", value: "same-origin" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "Cache-Control", value: "public, max-age=31536000, immutable" },
				],
			},
		];
	},
};

export default nextConfig;
