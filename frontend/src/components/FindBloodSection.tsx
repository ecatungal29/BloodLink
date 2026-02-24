"use client";

import { useState } from "react";
import { Search, MapPin, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const bloodTypes = [
	{ type: "A+", color: "from-rose-400 to-rose-500" },
	{ type: "A-", color: "from-rose-500 to-rose-600" },
	{ type: "B+", color: "from-red-400 to-red-500" },
	{ type: "B-", color: "from-red-500 to-red-600" },
	{ type: "AB+", color: "from-pink-400 to-pink-500" },
	{ type: "AB-", color: "from-pink-500 to-pink-600" },
	{ type: "O+", color: "from-orange-400 to-orange-500" },
	{ type: "O-", color: "from-orange-500 to-orange-600" },
];

function BloodTypeSelector({
	selected,
	onSelect,
}: {
	selected: string | null;
	onSelect: (type: string) => void;
}) {
	return (
		<div className="w-full">
			<label className="block text-sm font-medium text-slate-700 mb-3">
				Select Blood Type
			</label>
			<div className="grid grid-cols-4 gap-3">
				{bloodTypes.map((blood) => (
					<motion.button
						key={blood.type}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => onSelect(blood.type)}
						className={cn(
							"relative p-4 rounded-xl font-bold text-lg transition-all duration-300",
							selected === blood.type ?
								`bg-gradient-to-br ${blood.color} text-white shadow-lg`
							:	"bg-white border-2 border-slate-200 text-slate-700 hover:border-rose-200 hover:bg-rose-50",
						)}>
						{blood.type}
						{selected === blood.type && (
							<motion.div
								layoutId="selected-blood"
								className="absolute inset-0 rounded-xl ring-2 ring-offset-2 ring-rose-400"
								initial={false}
							/>
						)}
					</motion.button>
				))}
			</div>
		</div>
	);
}

const CITIES = [
	"All Cities",
	"Cityville",
	"Downtown",
	"Lakeshore",
	"West Heights",
	"Sunrise Valley",
];

const SORT_OPTIONS = ["Nearest to Me", "Most Available", "Alphabetical"];

interface FindBloodSectionProps {
	onSearch?: (params: {
		bloodType: string | null;
		query: string;
		city: string;
		sort: string;
	}) => void;
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
						Select a blood type and search for nearby hospitals with real-time
						availability.
					</p>
				</div>

				{/* Blood Type Selector + Search & Filters */}
				<div className="border border-slate-200 rounded-xl p-4">
					<div className="mb-8">
						<BloodTypeSelector
							selected={selectedType}
							onSelect={handleTypeSelect}
						/>
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
							<p className="text-sm font-semibold text-slate-700 mb-2">
								Sort by
							</p>
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
			</div>
		</section>
	);
}
