"use client";

import React from "react";
import { useTranslations } from "next-intl";

import { usePromptopiaContext } from "@/contexts/PromptopiaContext";

interface Props {
	userId: string; // the user to follow
}

// Not shown for the user himself. Without login a click opens the login.
const FollowButton: React.FC<Props> = ({ userId }) => {
	const t = useTranslations("Follow");
	const { session, followingIds, toggleFollow } = usePromptopiaContext();

	if (!userId || session?.user?.id === userId) {
		return null;
	}

	const isFollowing = followingIds.includes(userId);

	return (
		<button
			aria-pressed={isFollowing}
			className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
				isFollowing
					? "border-mlt-orange-secondary bg-mlt-orange-secondary text-white"
					: "border-mlt-orange-secondary bg-white text-mlt-orange-secondary hover:bg-mlt-orange-secondary hover:text-white"
			}`}
			type="button"
			onClick={() => toggleFollow(userId)}
		>
			{isFollowing ? t("following") : t("follow")}
		</button>
	);
};

export default FollowButton;
