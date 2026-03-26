import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "BloodLink",
	description: "Connecting blood donors with those in need.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className} suppressHydrationWarning>
				<ClientLayout>{children}</ClientLayout>
			</body>
		</html>
	);
}
