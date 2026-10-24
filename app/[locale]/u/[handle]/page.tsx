"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import UserPosts from "@/components/UserPosts";
import { Path } from "@/interfaces/Path";
import { PostStatus, PostTypeFromDb } from "@/interfaces/Post";
import { UserTypeFromDb } from "@/interfaces/User";
import { fetchPosts } from "@/lib/fetch-helpers";

/**
 * The public profile "/@username" (the middleware rewrites the address to "/{locale}/u/username").
 */
const PublicProfile_Page: React.FC = () => {
	const t = useTranslations("Profile");
	const params = useParams();
	const rawHandle = String(params?.handle ?? "");

	const [user, setUser] = useState<UserTypeFromDb | null>(null);
	const [posts, setPosts] = useState<PostTypeFromDb[]>([]);
	const [state, setState] = useState<"loading" | "ready" | "notFound">("loading");

	useEffect(() => {
		let active = true;

		(async () => {
			setState("loading");

			try {
				const handle = decodeURIComponent(rawHandle).replace(/^@/, "");
				const response = await fetch(`/api/users/by-username/${encodeURIComponent(handle)}`);

				if (!response.ok) {
					if (active) {
						setState("notFound");
					}

					return;
				}

				const profile: UserTypeFromDb = await response.json();
				const list: PostTypeFromDb[] = (await fetchPosts(`/api/users/${profile._id}/posts`)) ?? [];

				if (active) {
					setUser(profile);
					// The visitors see only the approved posts.
					setPosts(list.filter((post) => post.status === PostStatus.APPROVED));
					setState("ready");
					document.title = `@${profile.username} - ${profile.name ?? ""}`;
				}
			} catch (error) {
				if (active) {
					setState("notFound");
				}
			}
		})();

		return () => {
			active = false;
		};
	}, [rawHandle]);

	if (state === "notFound") {
		return (
			<section className="page_section_left w-full">
				<p className="text-lg text-mlt-dark-6">{t("notFound")}</p>
				<Link className="mt-4 text-mlt-orange-secondary underline" href={Path.HOME}>
					{t("backHome")}
				</Link>
			</section>
		);
	}

	if (state === "loading" || !user) {
		return <p className="mt-8 text-sm text-mlt-dark-6">{t("loading")}</p>;
	}

	return <UserPosts posts={posts} user={user} />;
};

export default PublicProfile_Page;
