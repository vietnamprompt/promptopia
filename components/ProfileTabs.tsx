"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import FollowersList from "./FollowersList";
import SavedPosts from "./SavedPosts";

type TabKey = "posts" | "followers" | "following" | "saved";

interface Props {
	userId: string;
	isOwner: boolean;
	showSaved: boolean; // the owner always, the visitors only if the user made the saved posts public
	postsContent: React.ReactNode; // the list of the posts (the newest first), it is built by the page
}

const ProfileTabs: React.FC<Props> = ({ userId, isOwner, showSaved, postsContent }) => {
	const t = useTranslations("ProfileTabs");
	const [active, setActive] = useState<TabKey>("posts");
	const [counts, setCounts] = useState<{ posts?: number; followers?: number; following?: number; saved?: number }>({});

	// The numbers in the names of the tabs.
	useEffect(() => {
		let alive = true;

		(async () => {
			try {
				const response = await fetch(`/api/users/${userId}/data`);
				const data = await response.json();

				if (alive) {
					setCounts({
							posts: data.postsCount,
							followers: data.followersCount,
							following: data.followingCount,
							saved: data.savedCount,
						});
				}
			} catch (error) {
				console.error(error);
			}
		})();

		return () => {
			alive = false;
		};
	}, [userId]);

	const withCount = (label: string, count?: number) =>
		typeof count === "number" ? `${label} (${count})` : label;

	const tabs: { key: TabKey; label: string }[] = [
		{ key: "posts", label: withCount(t("posts"), counts.posts) },
		{ key: "followers", label: withCount(t("followers"), counts.followers) },
		{ key: "following", label: withCount(t("following"), counts.following) },
		...(showSaved ? [{ key: "saved" as TabKey, label: withCount(t("saved"), counts.saved) }] : []),
	];

	return (
		<div className="mt-8 w-full">
			<div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2" role="tablist">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						aria-selected={active === tab.key}
						className={`rounded-full px-4 py-1 text-sm font-medium transition ${
							active === tab.key
								? "bg-mlt-orange-secondary text-white"
								: "bg-white text-mlt-dark-4 hover:text-mlt-orange-secondary"
						}`}
						role="tab"
						type="button"
						onClick={() => setActive(tab.key)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{active === "posts" && postsContent}
			{active === "followers" && <FollowersList key="followers" type="followers" userId={userId} />}
			{active === "following" && <FollowersList key="following" type="following" userId={userId} />}
			{active === "saved" && showSaved && <SavedPosts isOwner={isOwner} userId={userId} />}
		</div>
	);
};

export default ProfileTabs;
