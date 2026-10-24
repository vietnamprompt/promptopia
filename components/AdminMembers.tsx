"use client";
import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import logo from "@/public/icons/svg/mlt.promptopia.logo.favicon.svg";

interface Member {
	_id: string;
	name: string;
	username: string;
	email: string;
	image: string;
	blocked: boolean;
	isAdmin: boolean;
	postsCount: number;
}

/**
 * The tab "Members" of the admin page: the list of the members and the button to block them.
 */
const AdminMembers: React.FC = () => {
	const t = useTranslations("Admin");
	const [members, setMembers] = useState<Member[]>([]);
	const [total, setTotal] = useState(0);
	const [pageSize, setPageSize] = useState(30);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [query, setQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [busyId, setBusyId] = useState("");

	// The search starts a short time after the typing stops.
	useEffect(() => {
		const timer = setTimeout(() => {
			setQuery(search.trim());
			setPage(1);
		}, 400);

		return () => clearTimeout(timer);
	}, [search]);

	const load = useCallback(async () => {
		setLoading(true);
		setError(false);

		try {
			const response = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}&page=${page}`);

			if (!response.ok) {
				throw new Error("Failed");
			}

			const data = await response.json();

			// The next pages are added to the list.
			setMembers((previous) => (page === 1 ? data.users : [...previous, ...data.users]));
			setTotal(data.total ?? 0);
			setPageSize(data.pageSize ?? 30);
		} catch (err) {
			console.error(err);
			setError(true);
		} finally {
			setLoading(false);
		}
	}, [query, page]);

	useEffect(() => {
		load();
	}, [load]);

	const toggleBlock = async (member: Member) => {
		const blocked = !member.blocked;

		if (!window.confirm(blocked ? t("members.confirmBlock") : t("members.confirmUnblock"))) {
			return;
		}

		setBusyId(member._id);
		setError(false);

		try {
			const response = await fetch("/api/admin/users", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: member._id, blocked }),
			});

			if (!response.ok) {
				throw new Error("Failed");
			}

			setMembers((previous) =>
				previous.map((item) => (item._id === member._id ? { ...item, blocked } : item))
			);
		} catch (err) {
			console.error(err);
			setError(true);
		} finally {
			setBusyId("");
		}
	};

	return (
		<div className="mt-8 w-full">
			<input
				className="form_input max-w-md"
				placeholder={t("members.search")}
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>

			<p className="mt-3 text-sm text-mlt-dark-6">{t("members.total", { count: total })}</p>

			{error && <p className="form_error mt-3 text-sm">{t("error")}</p>}

			<ul className="mt-4 flex flex-col gap-3">
				{members.map((member) => (
					<li
						key={member._id}
						className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${
							member.blocked ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
						}`}
					>
						<Image
							unoptimized
							alt=""
							className="h-10 w-10 shrink-0 rounded-full bg-white object-cover"
							height={40}
							src={member.image || logo}
							width={40}
						/>

						<div className="min-w-0 flex-1">
							<p className="truncate font-semibold text-mlt-dark-2">
								{member.name || "-"}
								{member.isAdmin && (
									<span className="ml-2 rounded bg-mlt-orange-secondary px-1.5 py-0.5 text-xs font-medium text-white">
										{t("members.admin")}
									</span>
								)}
								{member.blocked && (
									<span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white">
										{t("members.blocked")}
									</span>
								)}
							</p>
							<p className="truncate text-sm text-mlt-dark-6">@{member.username}</p>
							<p className="truncate text-sm text-mlt-dark-6">{member.email}</p>
						</div>

						<span className="text-sm text-mlt-dark-6">
							{t("members.posts")}: {member.postsCount}
						</span>

						{!member.isAdmin && (
							<button
								className={`_btn ${member.blocked ? "gray_light" : "red_invert"}`}
								disabled={busyId === member._id}
								type="button"
								onClick={() => toggleBlock(member)}
							>
								{member.blocked ? t("members.unblock") : t("members.block")}
							</button>
						)}
					</li>
				))}
			</ul>

			{loading && <p className="mt-4 text-mlt-dark-6">{t("loading")}</p>}

			{!loading && members.length === 0 && (
				<p className="mt-4 text-mlt-dark-6">{t("members.empty")}</p>
			)}

			{!loading && members.length < total && members.length >= pageSize && (
				<button className="_btn gray_light mt-6" type="button" onClick={() => setPage(page + 1)}>
					{t("members.more")}
				</button>
			)}
		</div>
	);
};

export default AdminMembers;
