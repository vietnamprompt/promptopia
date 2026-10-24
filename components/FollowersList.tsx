"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import logo from "@/public/icons/svg/mlt.promptopia.logo.favicon.svg";
import { Path } from "@/interfaces/Path";

import FollowButton from "./fragments/FollowButton";

interface FollowerUser {
	_id: string;
	name?: string;
	username: string;
	image?: string;
}

interface Props {
	userId: string;
}

const FollowersList: React.FC<Props> = ({ userId }) => {
	const t = useTranslations("Follow");
	const [users, setUsers] = useState<FollowerUser[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;

		(async () => {
			try {
				const response = await fetch(`/api/users/${userId}/followers`);
				const data = await response.json();

				if (active) {
					setUsers(data.users ?? []);
					setTotal(data.total ?? 0);
				}
			} catch (error) {
				console.error(error);
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		})();

		return () => {
			active = false;
		};
	}, [userId]);

	if (loading) {
		return <p className="mt-6 text-sm text-mlt-dark-6">{t("loading")}</p>;
	}

	if (users.length === 0) {
		return <p className="mt-6 text-sm text-mlt-dark-6">{t("noFollowers")}</p>;
	}

	return (
		<div className="mt-6 w-full max-w-xl">
			<ul className="flex flex-col gap-3">
				{users.map((user) => (
					<li key={user._id} className="flex items-center justify-between gap-3">
						<Link
							className="flex min-w-0 items-center gap-3"
							href={`${Path.POSTS}?user_id=${user._id}`}
						>
							<Image
								unoptimized
								alt=""
								className="h-10 w-10 rounded-full bg-white object-cover"
								height={40}
								src={user.image || logo}
								width={40}
							/>
							<span className="min-w-0">
								<span className="block truncate font-semibold text-mlt-dark-2">
									{user.name || `@${user.username}`}
								</span>
								<span className="block truncate text-sm text-mlt-dark-6">@{user.username}</span>
							</span>
						</Link>

						<FollowButton userId={user._id} />
					</li>
				))}
			</ul>

			{total > users.length && (
				<p className="mt-3 text-xs text-mlt-dark-6">{t("showingFirst", { count: users.length })}</p>
			)}
		</div>
	);
};

export default FollowersList;
