"use client";

import { useState } from "react";
import {
	Calendar,
	Filter,
	ChevronDown,
	User,
	Phone,
	Clock,
	XCircle,
} from "lucide-react";

type Status = "all" | "pending" | "confirmed" | "completed" | "cancelled";
type Urgency = "urgent" | "normal";

interface Reservation {
	id: number;
	bloodType: string;
	hospitalName: string;
	unitsRequested: number;
	status: "pending" | "confirmed" | "completed" | "cancelled";
	urgency: Urgency;
	patientName: string;
	phone: string;
	pickupDate: string;
	createdDate: string;
}

const SAMPLE_RESERVATIONS: Reservation[] = [
	{
		id: 1,
		bloodType: "O+",
		hospitalName: "Pacific Regional Hospital",
		unitsRequested: 2,
		status: "cancelled",
		urgency: "urgent",
		patientName: "Ernest Gwapo",
		phone: "09363504506",
		pickupDate: "Jan 19, 2026",
		createdDate: "Jan 18, 2026",
	},
	{
		id: 2,
		bloodType: "A+",
		hospitalName: "City General Hospital",
		unitsRequested: 1,
		status: "confirmed",
		urgency: "normal",
		patientName: "Ernest Gwapo",
		phone: "09363504506",
		pickupDate: "Jan 22, 2026",
		createdDate: "Jan 20, 2026",
	},
	{
		id: 3,
		bloodType: "B-",
		hospitalName: "Downtown Medical Plaza",
		unitsRequested: 3,
		status: "pending",
		urgency: "urgent",
		patientName: "Ernest Gwapo",
		phone: "09363504506",
		pickupDate: "Jan 25, 2026",
		createdDate: "Jan 21, 2026",
	},
];

const STATUS_LABELS: Record<string, string> = {
	all: "All Status",
	pending: "Pending",
	confirmed: "Confirmed",
	completed: "Completed",
	cancelled: "Cancelled",
};

const statusBadge = (status: Reservation["status"]) => {
	switch (status) {
		case "cancelled":
			return (
				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-500">
					<XCircle className="w-3 h-3" />
					Cancelled
				</span>
			);
		case "confirmed":
			return (
				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
					Confirmed
				</span>
			);
		case "completed":
			return (
				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
					Completed
				</span>
			);
		case "pending":
			return (
				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
					Pending
				</span>
			);
	}
};

const urgencyBadge = (urgency: Urgency) =>
	urgency === "urgent" ? (
		<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
			Urgent
		</span>
	) : null;

export default function MyReservationsPage() {
	const [statusFilter, setStatusFilter] = useState<Status>("all");
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const filtered =
		statusFilter === "all"
			? SAMPLE_RESERVATIONS
			: SAMPLE_RESERVATIONS.filter((r) => r.status === statusFilter);

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Hero Banner */}
			<div className="bg-gradient-to-br from-rose-500 to-red-600 pt-12 pb-20 px-4 text-center">
				<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
					<Calendar className="w-8 h-8 text-white" />
				</div>
				<h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
					My Reservations
				</h1>
				<p className="text-rose-100 text-sm md:text-base max-w-sm mx-auto">
					Track and manage all your blood unit reservations
				</p>
			</div>

			{/* Content — overlaps the hero */}
			<div className="max-w-2xl mx-auto px-4 -mt-8 pb-16">
				{/* Filter Bar */}
				<div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 mb-4 flex items-center justify-between gap-4">
					<div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
						<Filter className="w-4 h-4" />
						Filter by Status
					</div>
					<div className="relative">
						<button
							onClick={() => setDropdownOpen(!dropdownOpen)}
							className="flex items-center gap-2 text-sm font-medium text-slate-700 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
							{STATUS_LABELS[statusFilter]}
							<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
						</button>
						{dropdownOpen && (
							<div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-10">
								{(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
									<button
										key={s}
										onClick={() => { setStatusFilter(s); setDropdownOpen(false); }}
										className={`w-full text-left px-4 py-2 text-sm transition-colors ${
											statusFilter === s
												? "text-rose-600 bg-rose-50 font-medium"
												: "text-slate-600 hover:bg-slate-50"
										}`}>
										{STATUS_LABELS[s]}
									</button>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Reservation Cards */}
				<div className="space-y-4">
					{filtered.length === 0 ? (
						<div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-12 text-center">
							<Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
							<p className="text-slate-500 text-sm">No reservations found.</p>
						</div>
					) : (
						filtered.map((r) => (
							<div
								key={r.id}
								className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
								{/* Card Header */}
								<div className="flex items-start justify-between gap-4 mb-4">
									<div className="flex items-center gap-3">
										{/* Blood type badge */}
										<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shrink-0">
											<span className="text-white font-bold text-sm">
												{r.bloodType}
											</span>
										</div>
										<div>
											<p className="font-semibold text-slate-900 text-sm leading-tight">
												{r.hospitalName}
											</p>
											<p className="text-xs text-slate-400 mt-0.5">
												{r.unitsRequested} unit{r.unitsRequested > 1 ? "s" : ""} requested
											</p>
										</div>
									</div>
									{/* Badges */}
									<div className="flex flex-col items-end gap-1.5 shrink-0">
										{statusBadge(r.status)}
										{urgencyBadge(r.urgency)}
									</div>
								</div>

								{/* Divider */}
								<div className="border-t border-slate-100 mb-4" />

								{/* Details */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<div className="flex items-center gap-2 text-sm text-slate-500">
										<User className="w-4 h-4 shrink-0 text-slate-400" />
										<span>{r.patientName}</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-slate-500">
										<Phone className="w-4 h-4 shrink-0 text-slate-400" />
										<span>{r.phone}</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-slate-500">
										<Calendar className="w-4 h-4 shrink-0 text-slate-400" />
										<span>Pickup: {r.pickupDate}</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-slate-500">
										<Clock className="w-4 h-4 shrink-0 text-slate-400" />
										<span>Created: {r.createdDate}</span>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
