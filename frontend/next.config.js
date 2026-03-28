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
				source: "/api/auth/profile/me",
				destination: `${API_URL}/api/auth/profile/me/`,
			},
			{
				source: "/api/auth/profile/me/",
				destination: `${API_URL}/api/auth/profile/me/`,
			},
			{
				source: "/api/auth/password/change",
				destination: `${API_URL}/api/auth/password/change/`,
			},
			{
				source: "/api/auth/password/change/",
				destination: `${API_URL}/api/auth/password/change/`,
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
				source: "/api/auth/users",
				destination: `${API_URL}/api/auth/users/`,
			},
			{
				source: "/api/auth/users/",
				destination: `${API_URL}/api/auth/users/`,
			},
			{
				source: "/api/donations/inventory",
				destination: `${API_URL}/api/donations/inventory/`,
			},
			{
				source: "/api/donations/inventory/",
				destination: `${API_URL}/api/donations/inventory/`,
			},
			{
				source: "/api/donations/requests",
				destination: `${API_URL}/api/donations/requests/`,
			},
			{
				source: "/api/donations/requests/",
				destination: `${API_URL}/api/donations/requests/`,
			},
			{
				source: "/api/donations/search",
				destination: `${API_URL}/api/donations/search/`,
			},
			{
				source: "/api/donations/search/",
				destination: `${API_URL}/api/donations/search/`,
			},
			{
				source: "/api/donations/responses",
				destination: `${API_URL}/api/donations/responses/`,
			},
			{
				source: "/api/donations/responses/",
				destination: `${API_URL}/api/donations/responses/`,
			},
			{
				source: "/api/:path*",
				destination: `${API_URL}/api/:path*`,
			},
		];
	},
};

module.exports = nextConfig;
