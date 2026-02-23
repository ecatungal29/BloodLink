import { Droplets, Building2, ClipboardCheck } from "lucide-react";

const steps = [
	{
		number: "01",
		Icon: Droplets,
		title: "Select Blood Type",
		description:
			"Choose the specific blood type you need from our comprehensive list of all 8 blood types.",
	},
	{
		number: "02",
		Icon: Building2,
		title: "Find Hospitals",
		description:
			"Browse nearby hospitals with real-time availability updates and availability status.",
	},
	{
		number: "03",
		Icon: ClipboardCheck,
		title: "Reserve Units",
		description:
			"Submit your reservation request and get confirmation directly from the hospital.",
	},
];

export default function HowItWorks() {
	return (
		<section className="py-20 px-4 bg-white">
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<div className="text-center mb-16">
					<h2 className="text-3xl font-bold text-slate-900 mb-4">
						How BloodLink Works
					</h2>
					<p className="text-slate-500">
						A simple 3-step process to help you access the blood you need
					</p>
				</div>

				{/* Steps */}
				<div className="grid md:grid-cols-3 gap-10">
					{steps.map((step) => (
						<div key={step.number} className="text-center">
							{/* Icon with step badge */}
							<div className="relative inline-flex mb-6">
								<div className="w-20 h-20 rounded-2xl bg-rose-50 flex items-center justify-center">
									<step.Icon className="w-9 h-9 text-rose-600" />
								</div>
								<span className="absolute -top-2 -right-3 min-w-[28px] h-7 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center px-1.5">
									{step.number}
								</span>
							</div>
							<h3 className="text-xl font-bold text-slate-900 mb-3">
								{step.title}
							</h3>
							<p className="text-slate-500 leading-relaxed">{step.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
