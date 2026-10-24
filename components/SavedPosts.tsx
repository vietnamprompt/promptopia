"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { PostTypeFromDb } from "@/interfaces/Post";
import { fetchPosts } from "@/lib/fetch-helpers";

import PostCardList from "./PostCardList";

interface Props {
	userId: string;
	isOwner: boolean;
}

const SavedPosts: React.FC<Props> = ({ userId, isOwner }) => {
	const t = useTranslations("Save");
	const [posts, setPosts] = useState<PostTypeFromDb[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;

		(async () => {
			const result = await fetchPosts(`/api/users/${userId}/saved`);

			if (active) {
				setPosts(result ?? []);
				setLoading(false);
			}
		})();

		return () => {
			active = false;
		};
	}, [userId]);

	if (loading) {
		return <p className="mt-6 text-sm text-mlt-dark-6">{t("loading")}</p>;
	}

	return (
		<>
			{isOwner && <p className="mt-6 max-w-md text-sm text-mlt-dark-6">{t("privateNote")}</p>}

			{posts.length === 0 ? (
				<p className="mt-6 text-sm text-mlt-dark-6">{t("empty")}</p>
			) : (
				<PostCardList data={posts} />
			)}
		</>
	);
};

export default SavedPosts;
