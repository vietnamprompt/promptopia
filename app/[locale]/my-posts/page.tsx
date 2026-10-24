"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import Header from "@/components/Header";
import PostCardList from "@/components/PostCardList";
import { Path } from "@/interfaces/Path";
import { PostTypeFromDb } from "@/interfaces/Post";
import { usePromptopiaContext } from "@/contexts/PromptopiaContext";
import { fetchPosts } from "@/lib/fetch-helpers";

/**
 * "My prompts": all posts of the logged in user (pending, approved and rejected),
 * with the buttons to edit and to delete them.
 */
const MyPosts_Page: React.FC = () => {
	const t = useTranslations("MyPosts");
	const tProfile = useTranslations("Profile");
	const { session } = usePromptopiaContext();
	const [posts, setPosts] = useState<PostTypeFromDb[]>([]);
	const [loading, setLoading] = useState(true);
	const userId = session?.user?.id;

	useEffect(() => {
		if (!userId) {
			return;
		}

		(async () => {
			setPosts((await fetchPosts(`/api/users/${userId}/posts`)) ?? []);
			setLoading(false);
		})();
	}, [userId]);

	if (!session) {
		return null;
	}

	return (
		<section className="page_section_left w-full">
			<Header
				desc={t("description")}
				gradient="blue_gradient"
				textStyle="text-left"
				titleGradient={t("title")}
			/>

			<p className="mt-6 max-w-md text-sm text-mlt-dark-6">{tProfile("moderationNote")}</p>

			{!loading && posts.length === 0 ? (
				<div className="mt-10 flex flex-col items-start gap-4">
					<p className="text-mlt-dark-6">{t("empty")}</p>
					<Link className="_btn orange_invert" href={Path.POST_CREATE}>
						{t("create")}
					</Link>
				</div>
			) : (
				<div className="mt-10 w-full">
					<PostCardList data={posts} />
				</div>
			)}
		</section>
	);
};

export default MyPosts_Page;
