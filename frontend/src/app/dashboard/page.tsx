"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import DashboardCards from "@/components/DashboardCards";

export default function Dashboard() {
	const [user, setUser] = useState<any>(null);
	const [bloodRequests, setBloodRequests] = useState([]);
	const [donations, setDonations] = useState([]);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const userData = localStorage.getItem("user");
		const token = localStorage.getItem("access_token");

		if (!userData || !token) {
			router.push("/auth/login");
			return;
		}

		setUser(JSON.parse(userData));
		fetchDashboardData();
	}, [router]);

	const fetchDashboardData = async () => {
		try {
			const token = localStorage.getItem("access_token");

			const [requestsResponse, donationsResponse] = await Promise.all([
				fetch("/api/donations/requests/", {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch("/api/donations/donations/", {
					headers: { Authorization: `Bearer ${token}` },
				}),
			]);

			if (requestsResponse.ok) {
				const requestsData = await requestsResponse.json();
				setBloodRequests(requestsData.results || []);
			}

			if (donationsResponse.ok) {
				const donationsData = await donationsResponse.json();
				setDonations(donationsData.results || []);
			}
		} catch (error) {
			console.error("Error fetching dashboard data:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = () => {
		localStorage.removeItem("access_token");
		localStorage.removeItem("refresh_token");
		localStorage.removeItem("user");
		router.push("/auth/login");
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<Navigation userName={user?.first_name} onLogout={handleLogout} />

			<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				<DashboardCards bloodRequests={bloodRequests} donations={donations} />
			</div>
		</div>
	);
}
