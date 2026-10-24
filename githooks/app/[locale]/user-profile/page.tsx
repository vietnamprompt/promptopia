"use client";
import React, { useState, useEffect } from "react";

import UserProfile from "@/components/UserProfile";
import { PostTypeFromDb } from "@/interfaces/Post";
import { fetchPosts } from "@/lib/fetch-helpers";
import { UserTypeFromDb } from "@/interfaces/User";
import { usePromptopiaContext } from "@/contexts/PromptopiaContext";

const UserProfile_Page: React.FC = () => {
	const { session } = usePromptopiaContext();
	const [userPosts, setUserPosts] = useState<PostTypeFromDb[]>([]);
	const userId = session?.user?.id;

	useEffect(() => {
		if (!userId) {
			return;
		}

		// The homepage keeps only the approved posts, but the profile page must show
		// all posts of the user (including the pending and the rejected ones).
		(async () => {
			setUserPosts((await fetchPosts(`/api/users/${userId}/posts`)) ?? []);
		})();
	}, [userId]);

	return (
		session && <UserProfile posts={userPosts} user={session?.user as unknown as UserTypeFromDb} />
	);
};

export default UserProfile_Page;
