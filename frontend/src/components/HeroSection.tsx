import Link from "next/link";

export default function HeroSection() {
	return (
		<div className="text-center mb-12">
			<h1 className="text-4xl font-bold text-red-600 mb-4">BloodLink</h1>
			<p className="text-xl text-gray-600 mb-8">
				Connecting blood donors with those in needsss
			</p>
			<div className="space-x-4">
				<Link
					href="/auth/login"
					className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors">
					Login
				</Link>
				<Link
					href="/auth/register"
					className="bg-white text-red-500 border-2 border-red-500 px-6 py-3 rounded-lg hover:bg-red-50 transition-colors">
					Register
				</Link>
			</div>
		</div>
	);
}
