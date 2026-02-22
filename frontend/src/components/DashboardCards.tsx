"use cache";

interface BloodRequest {
	id: string;
	blood_type: string;
	units_needed: number;
	hospital_name: string;
	urgency_level: "critical" | "high" | "medium" | "low";
}

interface Donation {
	id: string;
	units_donated: number;
	location: string;
	status: "completed" | "scheduled" | "pending";
}

interface DashboardCardsProps {
	bloodRequests: BloodRequest[];
	donations: Donation[];
}

export default async function DashboardCards({
	bloodRequests,
	donations,
}: DashboardCardsProps) {
	const getUrgencyColor = (urgency: string) => {
		switch (urgency) {
			case "critical":
				return "text-red-600";
			case "high":
				return "text-orange-600";
			case "medium":
				return "text-yellow-600";
			default:
				return "text-green-600";
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "text-green-600";
			case "scheduled":
				return "text-blue-600";
			default:
				return "text-gray-600";
		}
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div className="bg-white overflow-hidden shadow rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<h3 className="text-lg leading-6 font-medium text-gray-900">
						Recent Blood Requests
					</h3>
					<div className="mt-4">
						{bloodRequests.length === 0 ?
							<p className="text-gray-500">No blood requests found.</p>
						:	<div className="space-y-3">
								{bloodRequests.slice(0, 5).map((request) => (
									<div
										key={request.id}
										className="border-l-4 border-red-500 pl-4">
										<div className="text-sm">
											<p className="font-medium text-gray-900">
												{request.blood_type} - {request.units_needed} units
											</p>
											<p className="text-gray-600">{request.hospital_name}</p>
											<p className="text-gray-500">
												Urgency:{" "}
												<span
													className={`font-medium ${getUrgencyColor(request.urgency_level)}`}>
													{request.urgency_level}
												</span>
											</p>
										</div>
									</div>
								))}
							</div>
						}
					</div>
				</div>
			</div>

			<div className="bg-white overflow-hidden shadow rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<h3 className="text-lg leading-6 font-medium text-gray-900">
						Your Donation History
					</h3>
					<div className="mt-4">
						{donations.length === 0 ?
							<p className="text-gray-500">No donation history found.</p>
						:	<div className="space-y-3">
								{donations.slice(0, 5).map((donation) => (
									<div
										key={donation.id}
										className="border-l-4 border-green-500 pl-4">
										<div className="text-sm">
											<p className="font-medium text-gray-900">
												{donation.units_donated} units donated
											</p>
											<p className="text-gray-600">{donation.location}</p>
											<p className="text-gray-500">
												Status:{" "}
												<span
													className={`font-medium ${getStatusColor(donation.status)}`}>
													{donation.status}
												</span>
											</p>
										</div>
									</div>
								))}
							</div>
						}
					</div>
				</div>
			</div>
		</div>
	);
}
