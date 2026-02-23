"use client";

import { useState } from "react";
import { Search, MapPin, ChevronDown } from "lucide-react";

const BLOOD_TYPES = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"];

const CITIES = ["All Cities", "Cityville", "Downtown", "Lakeshore", "West Heights", "Sunrise Valley"];

const SORT_OPTIONS = ["Nearest to Me", "Most Available", "Alphabetical"];

interface FindBloodSectionProps {
	onSearch?: (params: { bloodType: string | null; query: string; city: string; sort: string }) => void;
}

export default function FindBloodSection({ onSearch }: FindBloodSectionProps) {
	const [selectedType, setSelectedType] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [city, setCity] = useState("All Cities");
	const [sort, setSort] = useState("Nearest to Me");

	function handleTypeSelect(type: string) {
		const next = type === selectedType ? null : type;
		setSelectedType(next);
		onSearch?.({ bloodType: next, query: searchQuery, city, sort });
	}

	return (
		<section id="find-blood" className="py-16 px-4 bg-white">
			<div className="max-w-6xl mx-auto">
				{/* Header */}
				<div className="text-center mb-12">
					<h2 className="text-3xl font-bold text-slate-900 mb-3">
						Find Blood Near You
					</h2>
					<p className="text-slate-500 max-w-xl mx-auto">
						Start your search below (get real location in real-available units
						nearby hospitals)
					</p>
				</div>

				{/* Blood Type Selector */}
				<div className="mb-8">
					<p className="text-sm font-semibold text-slate-700 mb-4">
						Select Blood Type
					</p>
					<div className="flex flex-wrap gap-3">
						{BLOOD_TYPES.map((type) => (
							<button
								key={type}
								onClick={() => handleTypeSelect(type)}
								className={`px-6 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
									selectedType === type
										? "bg-rose-600 border-rose-600 text-white shadow-sm"
										: "border-slate-200 text-slate-700 hover:border-rose-300 hover:text-rose-600"
								}`}>
								{type}
							</button>
						))}
					</div>
				</div>

				{/* Search & Filters */}
				<div className="grid md:grid-cols-3 gap-5">
					{/* Search */}
					<div>
						<p className="text-sm font-semibold text-slate-700 mb-2">
							Search Hospital
						</p>
						<div className="relative">
							<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<input
								type="text"
								placeholder="Search by name..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
							/>
						</div>
					</div>

					{/* City Filter */}
					<div>
						<p className="text-sm font-semibold text-slate-700 mb-2">
							Filter by City
						</p>
						<div className="relative">
							<MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<select
								value={city}
								onChange={(e) => setCity(e.target.value)}
								className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent appearance-none bg-white">
								{CITIES.map((c) => (
									<option key={c}>{c}</option>
								))}
							</select>
							<ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
						</div>
					</div>

					{/* Sort */}
					<div>
						<p className="text-sm font-semibold text-slate-700 mb-2">Sort by</p>
						<div className="relative">
							<select
								value={sort}
								onChange={(e) => setSort(e.target.value)}
								className="w-full px-4 pr-10 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent appearance-none bg-white">
								{SORT_OPTIONS.map((s) => (
									<option key={s}>{s}</option>
								))}
							</select>
							<ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
