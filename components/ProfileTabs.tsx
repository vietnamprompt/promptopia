"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

import FollowersList from "./FollowersList";
import SavedPosts from "./SavedPosts";

type TabKey = "posts" | "followers" | "saved";

interface Props {
	userId: string;
	isOwner: boolean;
	showSaved: boolean; // the owner always, the visitors only if the user made the saved posts public
	followersCount?: number;
	postsContent: React.ReactNode; // the list of the posts, it is built by the page
}

const ProfileTabs: React.FC<Props> = ({ userId, isOwner, showSaved, followersCount, postsContent }) => {
	const t = useTranslations("ProfileTabs");
	const [active, setActive] = useState<TabKey>("posts");

	const tabs: { key: TabKey; label: string }[] = [
		{ key: "posts", label: t("posts") },
		{
			key: "followers",
			label: followersCount !== undefined ? `${t("followers")} (${followersCount})` : t("followers"),
		},
		...(showSaved ? [{ key: "saved" as TabKey, label: t("saved") }] : []),
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
			{active === "followers" && <FollowersList userId={userId} />}
			{active === "saved" && showSaved && <SavedPosts isOwner={isOwner} userId={userId} />}
		</div>
	);
};

export default ProfileTabs;
