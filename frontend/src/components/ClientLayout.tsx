"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
	Droplet,
	Home,
	Calendar,
	Menu,
	X,
	LogOut,
	User,
	Settings,
	Bell,
	ChevronRight,
	Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClientLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [user, setUser] = useState<any>(null);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const pathname = usePathname();

	useEffect(() => {
		// Mock user for now - replace with actual auth logic
		setUser({ full_name: "Ernesto Catungal", email: "ernesto@example.com" });
	}, []);

	const navigation = [
		{ name: "Home", href: "/", icon: Home },
		{ name: "My Reservations", href: "/my-reservations", icon: Calendar },
		{ name: "Settings", href: "/settings", icon: Settings },
		{ name: "Hospital Admin", href: "/hospital-admin", icon: Building },
	];

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Navigation */}
			<nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
				<div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						{/* Logo */}
						<Link href="/" className="flex items-center gap-2">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
								<Droplet className="w-5 h-5 text-white" />
							</div>
							<span className="text-xl font-bold text-slate-900">
								BloodLink
							</span>
						</Link>

						{/* Desktop Navigation */}
						<div className="hidden lg:flex items-center gap-1">
							{navigation.map((item) => (
								<Link
									key={item.href}
									href={item.href}
									className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
										pathname === item.href ?
											"bg-rose-50 text-rose-600"
										:	"text-slate-600 hover:bg-slate-50 hover:text-slate-900"
									}`}>
									<item.icon className="w-4 h-4" />
									{item.name}
								</Link>
							))}
						</div>

						{/* Tablet Navigation */}
						<div className="hidden md:flex lg:hidden items-center gap-1">
							{navigation.map((item) => (
								<Link
									key={item.href}
									href={item.href}
									className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
										pathname === item.href ?
											"bg-rose-50 text-rose-600"
										:	"text-slate-600 hover:bg-slate-50 hover:text-slate-900"
									}`}>
									<item.icon className="w-4 h-4" />
									{item.name}
								</Link>
							))}
						</div>

						{/* User Menu */}
						<div className="hidden md:flex items-center gap-3">
							{/* Notification Bell */}
							<button aria-label="Notifications" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
								<Bell className="w-5 h-5 text-slate-600" />
							</button>

							{user ?
								<div className="flex items-center gap-2">
									<div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50">
										<User className="w-4 h-4 text-slate-500" />
										<span className="text-sm font-medium text-slate-700">
											{user.full_name || user.email}
										</span>
									</div>
									<ChevronRight className="w-4 h-4 text-slate-400" />
								</div>
							:	<Button
									onClick={() => console.log("login")}
									className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-xl">
									Sign In
								</Button>
							}
						</div>

						{/* Mobile Menu Button */}
						<button
							aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
							aria-expanded={mobileMenuOpen}
							className="flex md:hidden p-2 rounded-xl hover:bg-slate-100"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
							{mobileMenuOpen ?
								<X className="w-6 h-6 text-slate-600" />
							:	<Menu className="w-6 h-6 text-slate-600" />}
						</button>
					</div>
				</div>

				{/* Mobile Menu */}
				<AnimatePresence>
					{mobileMenuOpen && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							className="md:hidden lg:hidden border-t border-slate-100 bg-white">
							<div className="px-4 py-4 space-y-2">
								{navigation.map((item) => (
									<Link
										key={item.href}
										href={item.href}
										onClick={() => setMobileMenuOpen(false)}
										className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
											pathname === item.href ?
												"bg-rose-50 text-rose-600"
											:	"text-slate-600 hover:bg-slate-50"
										}`}>
										<item.icon className="w-5 h-5" />
										{item.name}
									</Link>
								))}

								<div className="pt-4 border-t border-slate-100">
									{user ?
										<div className="space-y-2">
											<div className="flex items-center justify-between px-4 py-2">
												<div className="flex items-center gap-2">
													<User className="w-4 h-4 text-slate-500" />
													<span className="text-sm text-slate-600">
														{user.full_name || user.email}
													</span>
												</div>
											</div>
											<Button
												variant="outline"
												className="w-full justify-start"
												onClick={() => console.log("logout")}>
												<LogOut className="w-4 h-4 mr-2" />
												Sign Out
											</Button>
										</div>
									:	<Button
											className="w-full bg-gradient-to-r from-rose-500 to-red-600"
											onClick={() => console.log("login")}>
											Sign In
										</Button>
									}
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</nav>

			{/* Main Content */}
			<main>{children}</main>

			{/* Footer */}
			<footer className="bg-white border-t border-slate-100 py-12">
				<div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
					<div className="flex flex-col md:flex-row items-center justify-between gap-6">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
								<Droplet className="w-4 h-4 text-white" />
							</div>
							<span className="font-semibold text-slate-900">BloodLink</span>
						</div>
						<p className="text-sm text-slate-500">
							Connecting lives, one donation at a time.
						</p>
						<p className="text-sm text-slate-400">
							© {new Date().getFullYear()} BloodLink. All rights reserved.
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
