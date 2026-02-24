"use client";

import { useRouter } from "next/navigation";

interface NavigationProps {
	userName?: string;
	onLogout: () => void;
}

export default function Navigation({
	userName,
	onLogout,
}: NavigationProps) {
	const router = useRouter();

	return (
		<nav className="bg-white shadow-sm">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex items-center">
						<h1 className="text-2xl font-bold text-red-600">BloodLink</h1>
					</div>
					<div className="flex items-center space-x-4">
						{userName && (
							<span className="text-gray-700">Welcome, {userName}</span>
						)}
						<button
							onClick={onLogout}
							className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600">
							Logout
						</button>
					</div>
				</div>
			</div>
		</nav>
	);
}
