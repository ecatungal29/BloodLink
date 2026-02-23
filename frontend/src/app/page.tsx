import HeroSection from "@/components/HeroSection";
import FindBloodSection from "@/components/FindBloodSection";
import HospitalGrid from "@/components/HospitalGrid";
import HowItWorks from "@/components/HowItWorks";

export default function Home() {
	return (
		<div>
			<div className="bg-gradient-to-b from-rose-50 to-white">
				<HeroSection />
			</div>
			<FindBloodSection />
			<HospitalGrid />
			<HowItWorks />
		</div>
	);
}
