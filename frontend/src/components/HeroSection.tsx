import Link from "next/link";
import { Search, MapPin, Droplets } from "lucide-react";

export default function HeroSection() {
	return (
		<section className="py-24 px-4 text-center">
			{/* Badge */}
			<div className="inline-flex items-center gap-2 bg-rose-100 text-rose-700 px-4 py-2 rounded-full text-sm font-semibold mb-8">
				<Droplets className="w-4 h-4" />
				<span>Every drop saves a life</span>
			</div>

			{/* Heading */}
			<h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
				<span className="text-slate-900">Find Blood, </span>
				<span className="text-rose-600">Save Lives</span>
			</h1>

			{/* Description */}
			<p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
				Connect with nearby hospitals instantly. Search for specific blood
				types, check availability in real-time, and reserve units when you need
				them most.
			</p>

			{/* CTA Buttons */}
			<div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
				<Link
					href="#find-blood"
					className="flex items-center gap-2 bg-rose-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-rose-700 transition-colors shadow-sm">
					<Search className="w-5 h-5" />
					Search Blood Banks
				</Link>
				<Link
					href="#hospitals"
					className="flex items-center gap-2 border-2 border-rose-200 text-rose-700 bg-white px-8 py-4 rounded-xl font-semibold hover:border-rose-400 hover:bg-rose-50 transition-colors">
					<MapPin className="w-5 h-5" />
					Nearby Hospitals
				</Link>
			</div>

			{/* Stats */}
			<div className="flex flex-col sm:flex-row items-center justify-center gap-12 sm:gap-20">
				<div>
					<div className="text-4xl font-bold text-slate-900">8</div>
					<div className="text-sm text-slate-500 mt-1">Blood Types</div>
				</div>
				<div className="hidden sm:block w-px h-10 bg-slate-200" />
				<div>
					<div className="text-4xl font-bold text-slate-900">24/7</div>
					<div className="text-sm text-slate-500 mt-1">Availability</div>
				</div>
				<div className="hidden sm:block w-px h-10 bg-slate-200" />
				<div>
					<div className="text-4xl font-bold text-slate-900">Instant</div>
					<div className="text-sm text-slate-500 mt-1">Reservations</div>
				</div>
			</div>
		</section>
	);
}
