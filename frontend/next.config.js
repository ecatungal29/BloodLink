/** @type {import('next').NextConfig} */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig = {
	reactStrictMode: true,
	skipTrailingSlashRedirect: true,
	images: {
		remotePatterns: [
			{
				protocol: "http",
				hostname: "localhost",
				port: "8000",
				pathname: "/api/**",
			},
		],
	},
	async rewrites() {
		return [
			// Explicit rules (with and without trailing slash) prevent Django's
			// APPEND_SLASH redirect from looping back through the catch-all rule.
			{
				source: "/api/auth/login",
				destination: `${API_URL}/api/auth/login/`,
			},
			{
				source: "/api/auth/login/",
				destination: `${API_URL}/api/auth/login/`,
			},
			{
				source: "/api/donations/hospitals",
				destination: `${API_URL}/api/donations/hospitals/`,
			},
			{
				source: "/api/donations/hospitals/",
				destination: `${API_URL}/api/donations/hospitals/`,
			},
			{
				source: "/api/:path*",
				destination: `${API_URL}/api/:path*`,
			},
		];
	},
};

module.exports = nextConfig;
