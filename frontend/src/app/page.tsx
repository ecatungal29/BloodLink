import HeroSection from "@/components/HeroSection";
import FeatureCards from "@/components/FeatureCards";

export default function Home() {
	return (
		<div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
			<div className="container mx-auto px-4 py-8">
				<HeroSection />
				<FeatureCards />

				<div className="bg-white p-8 rounded-lg shadow-lg">
					<h2 className="text-2xl font-bold text-center mb-6">How It Works</h2>
					<div className="grid md:grid-cols-4 gap-6">
						<div className="text-center">
							<div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
								<span className="text-red-600 font-bold text-xl">1</span>
							</div>
							<h4 className="font-semibold mb-2">Register</h4>
							<p className="text-sm text-gray-600">
								Create an account as donor or recipient
							</p>
						</div>
						<div className="text-center">
							<div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
								<span className="text-red-600 font-bold text-xl">2</span>
							</div>
							<h4 className="font-semibold mb-2">Request/Donate</h4>
							<p className="text-sm text-gray-600">
								Submit donation requests or availability
							</p>
						</div>
						<div className="text-center">
							<div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
								<span className="text-red-600 font-bold text-xl">3</span>
							</div>
							<h4 className="font-semibold mb-2">Match</h4>
							<p className="text-sm text-gray-600">
								Get matched with compatible donors
							</p>
						</div>
						<div className="text-center">
							<div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
								<span className="text-red-600 font-bold text-xl">4</span>
							</div>
							<h4 className="font-semibold mb-2">Connect</h4>
							<p className="text-sm text-gray-600">
								Coordinate donation and save lives
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
