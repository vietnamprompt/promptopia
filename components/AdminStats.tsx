"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface Daily {
	date: string;
	users: number;
	posts: number;
}

interface Stats {
	totals: {
		users: number;
		blocked: number;
		trusted: number;
		posts: number;
		pending: number;
		approved: number;
		rejected: number;
	};
	daily: Daily[];
}

const sum = (list: Daily[], key: "users" | "posts") => list.reduce((total, row) => total + row[key], 0);

const Card: React.FC<{ label: string; value: number; hint?: string }> = ({ label, value, hint }) => (
	<div className="rounded-xl border border-gray-200 bg-white p-4">
		<p className="text-sm text-mlt-dark-6">{label}</p>
		<p className="mt-1 text-2xl font-bold text-mlt-dark-2">{value}</p>
		{hint && <p className="text-xs text-mlt-dark-6">{hint}</p>}
	</div>
);

// A simple bar chart: one bar for each day.
const Bars: React.FC<{ title: string; list: Daily[]; field: "users" | "posts"; color: string }> = ({
	title,
	list,
	field,
	color,
}) => {
	const max = Math.max(1, ...list.map((row) => row[field]));

	return (
		<div className="rounded-xl border border-gray-200 bg-white p-4">
			<p className="font-semibold text-mlt-dark-2">{title}</p>

			<div className="mt-4 flex h-32 items-end gap-1">
				{list.map((row) => (
					<div
						key={row.date}
						className="flex h-full flex-1 flex-col justify-end"
						title={`${row.date}: ${row[field]}`}
					>
						<div
							className={`w-full rounded-t ${color}`}
							style={{ height: `${(row[field] / max) * 100}%`, minHeight: row[field] > 0 ? 3 : 0 }}
						/>
					</div>
				))}
			</div>

			<div className="mt-1 flex justify-between text-xs text-mlt-dark-6">
				<span>{list[0]?.date.slice(5)}</span>
				<span>{list[list.length - 1]?.date.slice(5)}</span>
			</div>
		</div>
	);
};

/**
 * The tab "Statistics" of the admin page: the numbers of the members and of the posts.
 */
const AdminStats: React.FC = () => {
	const t = useTranslations("Admin");
	const [stats, setStats] = useState<Stats | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const response = await fetch("/api/admin/stats", { cache: "no-store" });

				if (!response.ok) {
					throw new Error("Failed");
				}

				setStats(await response.json());
			} catch (err) {
				console.error(err);
				setError(true);
			}
		})();
	}, []);

	if (error) {
		return <p className="form_error mt-8 text-sm">{t("error")}</p>;
	}

	if (!stats) {
		return <p className="mt-8 text-mlt-dark-6">{t("loading")}</p>;
	}

	const { totals, daily } = stats;
	const today = daily[daily.length - 1];
	const week = daily.slice(-7);

	return (
		<div className="mt-8 flex w-full flex-col gap-6">
			<div>
				<p className="form_input_title">{t("stats.members")}</p>
				<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					<Card label={t("stats.total")} value={totals.users} />
					<Card label={t("stats.today")} value={today?.users ?? 0} />
					<Card label={t("stats.last7")} value={sum(week, "users")} />
					<Card label={t("stats.trusted")} value={totals.trusted} />
					<Card label={t("stats.blocked")} value={totals.blocked} />
				</div>
			</div>

			<div>
				<p className="form_input_title">{t("stats.posts")}</p>
				<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
					<Card label={t("stats.total")} value={totals.posts} />
					<Card label={t("stats.today")} value={today?.posts ?? 0} />
					<Card label={t("stats.last7")} value={sum(week, "posts")} />
					<Card label={t("stats.pending")} value={totals.pending} />
					<Card label={t("stats.approved")} value={totals.approved} />
					<Card label={t("stats.rejected")} value={totals.rejected} />
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Bars color="bg-mlt-orange-secondary" field="users" list={daily} title={t("stats.chartUsers")} />
				<Bars color="bg-mlt-purple-secondary" field="posts" list={daily} title={t("stats.chartPosts")} />
			</div>
		</div>
	);
};

export default AdminStats;
