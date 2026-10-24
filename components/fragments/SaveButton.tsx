"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { usePromptopiaContext } from "@/contexts/PromptopiaContext";

interface Props {
	postId: string;
	count?: number; // the saved count that came with the post
}

// A bookmark with the number of users that saved the post. Without login a click opens the login.
const SaveButton: React.FC<Props> = ({ postId, count }) => {
	const t = useTranslations("Save");
	const { savedIds, toggleSave } = usePromptopiaContext();
	const [savedCount, setSavedCount] = useState(count ?? 0);
	const isSaved = savedIds.includes(postId);

	useEffect(() => {
		setSavedCount(count ?? 0);
	}, [count]);

	const handleClick = async () => {
		const newCount = await toggleSave(postId);

		// The server returns the exact number, otherwise the number stays as it was.
		if (newCount !== null) {
			setSavedCount(newCount);
		}
	};

	return (
		<button
			aria-label={isSaved ? t("unsave") : t("save")}
			aria-pressed={isSaved}
			className={`flex items-center gap-1 text-sm font-medium transition ${
				isSaved ? "text-mlt-orange-secondary" : "text-mlt-dark-6 hover:text-mlt-orange-secondary"
			}`}
			title={isSaved ? t("unsave") : t("save")}
			type="button"
			onClick={handleClick}
		>
			<svg
				fill={isSaved ? "currentColor" : "none"}
				height="18"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				viewBox="0 0 24 24"
				width="18"
			>
				<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
			</svg>
			<span>{savedCount}</span>
		</button>
	);
};

export default SaveButton;
