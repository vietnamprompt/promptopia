"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import { useSession, signIn, getProviders, LiteralUnion, ClientSafeProvider } from "next-auth/react";
import { Session } from "next-auth";

import { BuiltInProviderType } from "next-auth/providers";

import { PostTypeFromDb } from "@/interfaces/Post";
import { UserTypeFromDb } from "@/interfaces/User";

type AuthProvidersType = Record<
	LiteralUnion<BuiltInProviderType, string>,
	ClientSafeProvider
> | null;

interface PromptopiaContextProps {
	posts: PostTypeFromDb[];
	setPosts: React.Dispatch<React.SetStateAction<PostTypeFromDb[]>>;
	postsLoading: boolean;
	users: UserTypeFromDb[];
	setUsers: React.Dispatch<React.SetStateAction<UserTypeFromDb[]>>;
	authProviders: AuthProvidersType;
	session: Session | null;
	postCardListSize: number;
	setPostCardListSize: React.Dispatch<React.SetStateAction<number>>;
	followingIds: string[];
	savedIds: string[];
	// Follow / unfollow a user. Without login the user is sent to the login.
	toggleFollow: (userId: string) => Promise<void>;
	// Save / unsave a post, returns the new saved count (or null if it failed).
	toggleSave: (postId: string) => Promise<number | null>;
}

const PromptopiaContext = createContext<PromptopiaContextProps>({} as PromptopiaContextProps);

interface PromptopiaContextProviderProps {
	children: React.ReactNode;
}

export const PromptopiaContextProvider: React.FC<PromptopiaContextProviderProps> = ({
	children,
}) => {
	const [posts, setPosts] = useState<PostTypeFromDb[]>([]);
	const [postsLoading, setPostsLoading] = useState(true);
	const [users, setUsers] = useState<UserTypeFromDb[]>([]);
	const [authProviders, setAuthProviders] = useState<AuthProvidersType>(null);
	const [postCardListSize, setPostCardListSize] = useState(0);
	const [followingIds, setFollowingIds] = useState<string[]>([]);
	const [savedIds, setSavedIds] = useState<string[]>([]);
	const { data: session } = useSession();
	const sessionUserId = session?.user?.id;

	useEffect(() => {
		(async () => {
			setAuthProviders(await getProviders());
			// The homepage loads its posts page by page ('/api/feed'), so the list is not
			// loaded here any more. "posts" is kept for the pages that still read it.
			setPostsLoading(false);
		})();
	}, []);

	// The users that I follow and the posts that I saved, they are used by the buttons.
	useEffect(() => {
		if (!sessionUserId) {
			setFollowingIds([]);
			setSavedIds([]);

			return;
		}

		(async () => {
			try {
				const [follows, saves] = await Promise.all([
					fetch("/api/follows").then((response) => response.json()),
					fetch("/api/saves").then((response) => response.json()),
				]);

				setFollowingIds(follows?.ids ?? []);
				setSavedIds(saves?.ids ?? []);
			} catch (error) {
				console.error(error);
			}
		})();
	}, [sessionUserId]);

	const toggleFollow = async (userId: string) => {
		if (!sessionUserId) {
			signIn("google");

			return;
		}

		const wasFollowing = followingIds.includes(userId);

		// Optimistic: the button changes at once, the change is reverted if the server fails.
		setFollowingIds((ids) => (wasFollowing ? ids.filter((id) => id !== userId) : [...ids, userId]));

		try {
			const response = await fetch(`/api/follows/${userId}`, {
				method: wasFollowing ? "DELETE" : "POST",
			});

			if (!response.ok) {
				throw new Error("Follow failed");
			}
		} catch (error) {
			setFollowingIds((ids) => (wasFollowing ? [...ids, userId] : ids.filter((id) => id !== userId)));
		}
	};

	const toggleSave = async (postId: string) => {
		if (!sessionUserId) {
			signIn("google");

			return null;
		}

		const wasSaved = savedIds.includes(postId);

		setSavedIds((ids) => (wasSaved ? ids.filter((id) => id !== postId) : [...ids, postId]));

		try {
			const response = await fetch(`/api/saves/${postId}`, {
				method: wasSaved ? "DELETE" : "POST",
			});

			if (!response.ok) {
				throw new Error("Save failed");
			}

			const data = await response.json();

			return typeof data.savedCount === "number" ? data.savedCount : null;
		} catch (error) {
			setSavedIds((ids) => (wasSaved ? [...ids, postId] : ids.filter((id) => id !== postId)));

			return null;
		}
	};

	return (
		<PromptopiaContext.Provider
			value={{
				posts,
				setPosts,
				postsLoading,
				users,
				setUsers,
				authProviders,
				session,
				postCardListSize,
				setPostCardListSize,
				followingIds,
				savedIds,
				toggleFollow,
				toggleSave,
			}}
		>
			{children}
		</PromptopiaContext.Provider>
	);
};

export const usePromptopiaContext = () => useContext(PromptopiaContext);
