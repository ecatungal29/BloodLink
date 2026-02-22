"use cache";

export default async function FeatureCards() {
	return (
		<div className="grid md:grid-cols-3 gap-8 mb-12">
			<div className="bg-white p-6 rounded-lg shadow-lg">
				<div className="text-red-500 mb-4">
					<svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M3.172 5.172a4 4 0 015.656 0L9 10.343l7.172-7.171a4 4 0 115.656 0L9 14.657l-7.172-7.171a4 4 0 010-5.656z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
				<h3 className="text-xl font-semibold mb-2">Donate Blood</h3>
				<p className="text-gray-600">
					Save lives by donating blood. Register as a donor and help those in
					need.
				</p>
			</div>

			<div className="bg-white p-6 rounded-lg shadow-lg">
				<div className="text-red-500 mb-4">
					<svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916.548.548 0 00.777.276l1.027-1.551a3.527 3.527 0 00-1.804-1.257 3.527 3.527 0 00-2.71 1.18l-1.654 1.654a2 2 0 102.828 2.828l2.906 2.906a2 2 0 002.828 0l2.906-2.906a2 2 0 10-2.828-2.828z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
				<h3 className="text-xl font-semibold mb-2">Request Blood</h3>
				<p className="text-gray-600">
					Need blood? Submit a request and find compatible donors near you.
				</p>
			</div>

			<div className="bg-white p-6 rounded-lg shadow-lg">
				<div className="text-red-500 mb-4">
					<svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
						<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
						<path
							fillRule="evenodd"
							d="M4 5a2 2 0 012-2 1 1 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h2zm4 0a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2V5a2 2 0 012-2h2z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
				<h3 className="text-xl font-semibold mb-2">Track Inventory</h3>
				<p className="text-gray-600">
					Monitor blood bank inventory and availability in real-time.
				</p>
			</div>
		</div>
	);
}
