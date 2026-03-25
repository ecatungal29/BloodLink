"use client";

import { useState, useEffect } from "react";
import { api } from "@/api/client";
import type { User } from "@/types";

const ROLE_LABELS: Record<string, string> = {
	super_admin: "Super Admin",
	hospital_admin: "Hospital Admin",
	staff: "Staff",
	viewer: "Viewer",
};

interface PersonalInfoForm {
	first_name: string;
	last_name: string;
	phone_number: string;
}

interface PasswordForm {
	current_password: string;
	new_password: string;
	confirm_new_password: string;
}

export default function ProfilePage() {
	const [profile, setProfile] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState<string | null>(null);

	const [personalForm, setPersonalForm] = useState<PersonalInfoForm>({
		first_name: "",
		last_name: "",
		phone_number: "",
	});
	const [personalSaving, setPersonalSaving] = useState(false);
	const [personalSuccess, setPersonalSuccess] = useState(false);
	const [personalError, setPersonalError] = useState<string | null>(null);

	const [passwordForm, setPasswordForm] = useState<PasswordForm>({
		current_password: "",
		new_password: "",
		confirm_new_password: "",
	});
	const [passwordSaving, setPasswordSaving] = useState(false);
	const [passwordSuccess, setPasswordSuccess] = useState(false);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [currentPasswordError, setCurrentPasswordError] = useState<
		string | null
	>(null);
	const [newPasswordError, setNewPasswordError] = useState<string | null>(null);

	useEffect(() => {
		fetchProfile();
	}, []);

	const fetchProfile = async (): Promise<void> => {
		setLoading(true);
		setFetchError(null);

		try {
			const { data, error } = await api.get<User>("/api/auth/profile/me/");

			if (!data) {
				setFetchError(error ?? "Failed to load profile. Please refresh the page.");
				return;
			}

			setProfile(data);
			setPersonalForm({
				// Backend may allow blank strings; keep inputs controlled regardless.
				first_name: data.first_name ?? "",
				last_name: data.last_name ?? "",
				phone_number: data.phone_number ?? "",
			});
		} catch (err: unknown) {
			const message: string =
				err instanceof Error ? err.message : "Failed to load profile. Please refresh the page.";
			setFetchError(message);
		} finally {
			setLoading(false);
		}
	};

	const handlePersonalSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setPersonalSaving(true);
		setPersonalSuccess(false);
		setPersonalError(null);

		try {
			const { data, error } = await api.patch<User>("/api/auth/profile/me/", {
				first_name: personalForm.first_name,
				last_name: personalForm.last_name,
				phone_number: personalForm.phone_number,
			});

			if (data) {
				setProfile(data);
				const stored = localStorage.getItem("user");
				if (stored) {
					const parsed = JSON.parse(stored) as User;
					localStorage.setItem("user", JSON.stringify({ ...parsed, ...data }));
				}
				setPersonalSuccess(true);
				setTimeout(() => setPersonalSuccess(false), 4000);
			} else {
				setPersonalError(error ?? "Something went wrong.");
			}
		} catch {
			setPersonalError("Something went wrong. Please try again.");
		} finally {
			setPersonalSaving(false);
		}
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setPasswordSuccess(false);
		setPasswordError(null);
		setCurrentPasswordError(null);
		setNewPasswordError(null);

		if (passwordForm.new_password !== passwordForm.confirm_new_password) {
			setPasswordError("Passwords do not match.");
			return;
		}

		setPasswordSaving(true);

		try {
			const token = localStorage.getItem("access_token");
			const res = await fetch("/api/auth/password/change/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					current_password: passwordForm.current_password,
					new_password: passwordForm.new_password,
				}),
			});
			const json = await res.json();
			if (!res.ok) {
				if (json.current_password)
					setCurrentPasswordError(json.current_password[0]);
				if (json.new_password) setNewPasswordError(json.new_password[0]);
				if (json.error) setPasswordError(json.error);
				return;
			}
			setPasswordForm({
				current_password: "",
				new_password: "",
				confirm_new_password: "",
			});
			setPasswordSuccess(true);
			setTimeout(() => setPasswordSuccess(false), 4000);
		} catch {
			setPasswordError("Something went wrong. Please try again.");
		} finally {
			setPasswordSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="max-w-2xl space-y-6 animate-pulse">
				<div className="h-64 bg-white rounded-2xl border border-slate-100" />
				<div className="h-56 bg-white rounded-2xl border border-slate-100" />
			</div>
		);
	}

	return (
		<div className="max-w-2xl space-y-6">
			{/* Personal Information Card */}
			<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
				<h2 className="text-sm font-semibold text-slate-800 mb-5">
					Personal Information
				</h2>

				<form onSubmit={handlePersonalSubmit} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium text-slate-600 mb-1.5">
								First Name
							</label>
							<input
								type="text"
								value={personalForm.first_name}
								onChange={(e) =>
									setPersonalForm((prev) => ({
										...prev,
										first_name: e.target.value,
									}))
								}
								className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
								required
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-600 mb-1.5">
								Last Name
							</label>
							<input
								type="text"
								value={personalForm.last_name}
								onChange={(e) =>
									setPersonalForm((prev) => ({
										...prev,
										last_name: e.target.value,
									}))
								}
								className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
								required
							/>
						</div>
					</div>

					<div>
						<label className="block text-xs font-medium text-slate-600 mb-1.5">
							Phone Number
						</label>
						<input
							type="text"
							value={personalForm.phone_number}
							onChange={(e) =>
								setPersonalForm((prev) => ({
									...prev,
									phone_number: e.target.value,
								}))
							}
							className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium text-slate-600 mb-1.5">
								Email
							</label>
							<input
								type="text"
								value={profile?.email ?? ""}
								readOnly
								className="w-full px-3 py-2 text-sm rounded-xl border border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed"
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-600 mb-1.5">
								Role
							</label>
							<input
								type="text"
								value={ROLE_LABELS[profile?.role ?? ""] ?? profile?.role ?? ""}
								readOnly
								className="w-full px-3 py-2 text-sm rounded-xl border border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed"
							/>
						</div>
					</div>

					{profile?.hospital_name && (
						<div>
							<label className="block text-xs font-medium text-slate-600 mb-1.5">
								Hospital
							</label>
							<input
								type="text"
								value={profile.hospital_name}
								readOnly
								className="w-full px-3 py-2 text-sm rounded-xl border border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed"
							/>
						</div>
					)}

					{personalError && (
						<p className="text-xs text-red-600">{personalError}</p>
					)}

					{personalSuccess && (
						<p className="text-xs text-emerald-600">Profile updated.</p>
					)}

					<div className="flex justify-end pt-1">
						<button
							type="submit"
							disabled={personalSaving}
							className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
							{personalSaving ? "Saving…" : "Save Changes"}
						</button>
					</div>
				</form>
			</div>

			{/* Change Password Card */}
			<div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
				<h2 className="text-sm font-semibold text-slate-800 mb-5">
					Change Password
				</h2>

				<form onSubmit={handlePasswordSubmit} className="space-y-4">
					<div>
						<label className="block text-xs font-medium text-slate-600 mb-1.5">
							Current Password
						</label>
						<input
							type="password"
							value={passwordForm.current_password}
							onChange={(e) =>
								setPasswordForm((prev) => ({
									...prev,
									current_password: e.target.value,
								}))
							}
							className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
							required
						/>
						{currentPasswordError && (
							<p className="mt-1 text-xs text-red-600">
								{currentPasswordError}
							</p>
						)}
					</div>

					<div>
						<label className="block text-xs font-medium text-slate-600 mb-1.5">
							New Password
						</label>
						<input
							type="password"
							value={passwordForm.new_password}
							onChange={(e) =>
								setPasswordForm((prev) => ({
									...prev,
									new_password: e.target.value,
								}))
							}
							className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
							required
						/>
						{newPasswordError && (
							<p className="mt-1 text-xs text-red-600">{newPasswordError}</p>
						)}
					</div>

					<div>
						<label className="block text-xs font-medium text-slate-600 mb-1.5">
							Confirm New Password
						</label>
						<input
							type="password"
							value={passwordForm.confirm_new_password}
							onChange={(e) =>
								setPasswordForm((prev) => ({
									...prev,
									confirm_new_password: e.target.value,
								}))
							}
							className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
							required
						/>
					</div>

					{passwordError && (
						<p className="text-xs text-red-600">{passwordError}</p>
					)}

					{passwordSuccess && (
						<p className="text-xs text-emerald-600">Password updated.</p>
					)}

					<div className="flex justify-end pt-1">
						<button
							type="submit"
							disabled={passwordSaving}
							className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
							{passwordSaving ? "Updating…" : "Update Password"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
