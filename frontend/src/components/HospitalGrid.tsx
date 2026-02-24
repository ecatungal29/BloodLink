import { MapPin, Phone, Clock, ChevronRight, Bookmark } from "lucide-react";

interface Hospital {
	id: number;
	name: string;
	image: string;
	distance: string;
	available: boolean;
	address: string;
	phone: string;
	hours: string;
	bloodType: string;
	units: number;
}

const hospitals: Hospital[] = [
	{
		id: 1,
		name: "City General Hospital",
		image:
			"https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&auto=format&fit=crop",
		distance: "2.3 km",
		available: true,
		address: "123 Healthcare Drive, Cityville",
		phone: "(555) 123-4567",
		hours: "Open 24/7",
		bloodType: "B+",
		units: 12,
	},
	{
		id: 2,
		name: "Downtown Medical Plaza",
		image:
			"https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop",
		distance: "3.7 km",
		available: true,
		address: "456 Central Avenue, Downtown",
		phone: "(555) 234-5678",
		hours: "Mon–Sun: 6AM–10PM",
		bloodType: "B+",
		units: 8,
	},
	{
		id: 3,
		name: "Lakeshore Community Hospital",
		image:
			"https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&auto=format&fit=crop",
		distance: "4.2 km",
		available: true,
		address: "789 Waterfront Blvd, Lakeshore",
		phone: "(555) 345-6789",
		hours: "Mon–Sun: 6AM–11PM",
		bloodType: "B+",
		units: 5,
	},
	{
		id: 4,
		name: "Memorial Medical Center",
		image:
			"https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop",
		distance: "5.1 km",
		available: true,
		address: "321 Health Street, Memorial District",
		phone: "(555) 456-7890",
		hours: "Open 24/7",
		bloodType: "B+",
		units: 15,
	},
	{
		id: 5,
		name: "Pacific Regional Hospital",
		image:
			"https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=600&auto=format&fit=crop",
		distance: "6.8 km",
		available: false,
		address: "567 Ocean Parkway, West Heights",
		phone: "(555) 567-8901",
		hours: "Open 24/7",
		bloodType: "B+",
		units: 7,
	},
	{
		id: 6,
		name: "Sunrise Health Center",
		image:
			"https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?w=600&auto=format&fit=crop",
		distance: "7.5 km",
		available: true,
		address: "890 East Side Road, Sunrise Valley",
		phone: "(555) 678-9012",
		hours: "Mon–Sat: 7AM–9PM",
		bloodType: "B+",
		units: 10,
	},
];

export default function HospitalGrid() {
	return (
		<section id="hospitals" className="py-16 px-4 bg-slate-50">
			<div className="max-w-6xl mx-auto">
				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{hospitals.map((hospital) => (
						<div
							key={hospital.id}
							className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
							{/* Image */}
							<div className="relative h-48">
								<img
									src={hospital.image}
									alt={hospital.name}
									className="w-full h-full object-cover"
								/>
								<div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-slate-700">
									<MapPin className="w-3 h-3" />
									{hospital.distance}
								</div>
								{hospital.available && (
									<div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
										Available
									</div>
								)}
							</div>

							{/* Content */}
							<div className="p-5">
								<h3 className="text-base font-bold text-slate-900 mb-3">
									{hospital.name}
								</h3>

								<div className="space-y-1.5 mb-4">
									<div className="flex items-start gap-2 text-sm text-slate-500">
										<MapPin className="w-4 h-4 mt-0.5 shrink-0" />
										<span>{hospital.address}</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-slate-500">
										<Phone className="w-4 h-4 shrink-0" />
										<span>{hospital.phone}</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-slate-500">
										<Clock className="w-4 h-4 shrink-0" />
										<span>{hospital.hours}</span>
									</div>
								</div>

								<div className="flex items-center gap-2 mb-5">
									<span className="text-sm font-semibold text-rose-600">
										{hospital.bloodType} available
									</span>
									<span className="text-xs text-slate-400">•</span>
									<span className="text-sm text-slate-500">
										{hospital.units} units
									</span>
								</div>

								<div className="flex items-center gap-2">
									<button
										aria-label={`Reserve blood at ${hospital.name}`}
										className="flex-1 flex items-center justify-center gap-2 bg-rose-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors">
										Reserve Now
										<ChevronRight className="w-4 h-4" />
									</button>
									<button
										aria-label={`Save ${hospital.name}`}
										className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
										<Bookmark className="w-4 h-4 text-slate-500" />
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
