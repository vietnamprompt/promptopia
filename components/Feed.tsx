"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useSearchParams, useRouter } from "next/navigation";

import { usePromptopiaContext } from "@/contexts/PromptopiaContext";
import {
	FEED_TABS,
	FeedTab,
	SEARCH_PREFIX,
	SearchMode,
	parseSearchText,
} from "@/interfaces/Feed";
import { PostTypeFromDb } from "@/interfaces/Post";

import { Path } from "@/interfaces/Path";

import PostCardList from "./PostCardList";
import PostCardListLoading from "./PostCardListLoading";
import IconEmbedSvg from "./fragments/IconEmbedSvg";

const SEARCH_DELAY_MS = 500;
const TAG_SUGGESTIONS = 5;

interface TagInfo {
	tag: string;
	count: number;
}

const Feed: React.FC = () => {
	const t = useTranslations("Feed");
	const { session } = usePromptopiaContext();
	const sessionUserId = session?.user?.id;

	const [tab, setTab] = useState<FeedTab>(FeedTab.NEWEST);
	const [searchText, setSearchText] = useState("");
	const [query, setQuery] = useState(""); // the search text after the pause of the typing
	const [focused, setFocused] = useState(false);
	const [tags, setTags] = useState<TagInfo[] | null>(null); // the popular tags, loaded when needed

	const [posts, setPosts] = useState<PostTypeFromDb[]>([]);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [loginRequired, setLoginRequired] = useState(false);
	const [failed, setFailed] = useState(false);

	const searchParams = useSearchParams();
	const tagId = searchParams.get("tag");
	const wipe = searchParams.get("wipe");
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);

	// Only the last request is used: a slow old answer must not replace a newer one.
	const requestId = useRef(0);

	const { mode, term } = parseSearchText(searchText);
	const search = parseSearchText(query);

	const loadPage = useCallback(
		async (pageNumber: number) => {
			const id = ++requestId.current;

			const params = new URLSearchParams({
				tab,
				page: String(pageNumber),
				q: search.term,
				mode: search.mode,
			});

			try {
				const response = await fetch(`/api/feed?${params.toString()}`);

				if (!response.ok) {
					throw new Error("Feed request failed");
				}

				const data = await response.json();

				if (id !== requestId.current) {
					return;
				}

				const newPosts: PostTypeFromDb[] = data.posts ?? [];

				setPosts((current) => {
					if (pageNumber === 1) {
						return newPosts;
					}

					// A new post can shift the pages, so the posts that are already shown are skipped.
					const known = new Set(current.map((post) => post._id));

					return [...current, ...newPosts.filter((post) => !known.has(post._id))];
				});
				setPage(pageNumber);
				setHasMore(!!data.hasMore);
				setLoginRequired(!!data.loginRequired);
				setFailed(false);
			} catch (error) {
				if (id === requestId.current) {
					setFailed(true);
				}
			} finally {
				if (id === requestId.current) {
					setLoading(false);
					setLoadingMore(false);
				}
			}
		},
		// "search" is a new object on every render, its parts are the real dependencies.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[tab, search.term, search.mode]
	);

	// The search starts after a pause of the typing.
	useEffect(() => {
		const timeout = setTimeout(() => setQuery(searchText), SEARCH_DELAY_MS);

		return () => clearTimeout(timeout);
	}, [searchText]);

	// The first page is loaded again when the tab or the search change
	// (or when the user logs in: the "Following" tab depends on it).
	useEffect(() => {
		setLoading(true);
		setPosts([]);
		loadPage(1);
	}, [loadPage, sessionUserId]);

	const handleLoadMore = () => {
		setLoadingMore(true);
		loadPage(page + 1);
	};

	// The popular tags are loaded once, when the user starts to look for a tag.
	useEffect(() => {
		if (mode !== SearchMode.TAG || tags !== null) {
			return;
		}

		(async () => {
			try {
				const response = await fetch("/api/tags");
				const data = await response.json();

				setTags(data.tags ?? []);
			} catch (error) {
				setTags([]);
			}
		})();
	}, [mode, tags]);

	useEffect(() => {
		if (tagId) {
			setSearchText(`#${tagId}`);
			setTab(FeedTab.NEWEST);
			// The tag is in the search box now, the address is cleaned.
			router.replace(Path.HOME);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tagId]);

	const handleWipe = () => {
		router.push(Path.HOME);

		setSearchText("");
	};

	useEffect(() => {
		if (wipe) {
			handleWipe();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [wipe]);

	const chooseMode = (newMode: SearchMode) => {
		setSearchText(`${SEARCH_PREFIX[newMode]}${term}`);
		inputRef.current?.focus();
	};

	const chooseTag = (tag: string) => {
		setSearchText(`#${tag}`);
		setFocused(false);
	};

	const emptyMessage = () => {
		if (search.term) {
			return t("noResults");
		}

		switch (tab) {
			case FeedTab.FOLLOWING:
				return t("emptyFollowing");

			case FeedTab.TRENDING:
			case FeedTab.TOP:
				return t("emptyCopied");

			case FeedTab.SAVED:
				return t("emptySaved");

			default:
				return t("empty");
		}
	};

	const tagMatches =
		mode === SearchMode.TAG && tags
			? tags.filter((item) => item.tag.includes(term.toLowerCase())).slice(0, TAG_SUGGESTIONS)
			: [];

	const suggestions: { mode: SearchMode; text: string; label: string }[] = [
		{ mode: SearchMode.PROMPT, text: term, label: t("suggest.prompt") },
		{ mode: SearchMode.TAG, text: `#${term}`, label: t("suggest.tag") },
		{ mode: SearchMode.AUTHOR, text: `@${term}`, label: t("suggest.author") },
	];

	return (
		<section className="feed">
			<form
				className="relative w-full"
				onSubmit={(e) => {
					e.preventDefault();
				}}
			>
				<div className="search_input_container">
					{searchText && (
						<div className="wipe_search_btn" onClick={handleWipe}>
							<IconEmbedSvg
								color1="mlt-purple-secondary"
								color2="mlt-purple-secondary"
								height={26}
								opacity1="FF"
								opacity2="44"
								type="broom-wide"
								width={32}
							/>
						</div>
					)}

					<input
						ref={inputRef}
						required
						autoComplete="off"
						className="form_input search_input"
						placeholder={t("searchForPlaceholder")}
						type="text"
						value={searchText}
						onBlur={() => setFocused(false)}
						onChange={(e) => setSearchText(e.target.value)}
						onFocus={() => setFocused(true)}
					/>
				</div>

				{focused && searchText.trim() && (
					// onMouseDown keeps the focus in the input, so the click on a row is not lost.
					<ul
						className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
						onMouseDown={(e) => e.preventDefault()}
					>
						{suggestions.map((item) => (
							<li key={item.mode}>
								<button
									className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50 ${
										item.mode === mode ? "bg-orange-50" : ""
									}`}
									type="button"
									onClick={() => chooseMode(item.mode)}
								>
									<span className="truncate font-medium text-mlt-dark-2">{item.text}</span>
									<span className="shrink-0 text-xs text-mlt-dark-6">{item.label}</span>
								</button>
							</li>
						))}

						{tagMatches.map((item) => (
							<li key={item.tag}>
								<button
									className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
									type="button"
									onClick={() => chooseTag(item.tag)}
								>
									<span className="truncate text-mlt-dark-4">#{item.tag}</span>
									<span className="shrink-0 text-xs text-mlt-dark-6">{item.count}</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</form>

			<div className="mt-6 flex w-full flex-wrap gap-2" role="tablist">
				{FEED_TABS.map((feedTab) => (
					<button
						key={feedTab}
						aria-selected={tab === feedTab}
						className={`rounded-full px-4 py-1 text-sm font-medium transition ${
							tab === feedTab
								? "bg-mlt-orange-secondary text-white"
								: "bg-white text-mlt-dark-4 hover:text-mlt-orange-secondary"
						}`}
						role="tab"
						title={t(`tabHints.${feedTab}`)}
						type="button"
						onClick={() => setTab(feedTab)}
					>
						{t(`tabs.${feedTab}`)}
					</button>
				))}
			</div>

			{loading ? (
				<PostCardListLoading />
			) : failed && posts.length === 0 ? (
				<p className="mt-16 text-lg text-mlt-dark-6">{t("error")}</p>
			) : loginRequired ? (
				<p className="mt-16 text-lg text-mlt-dark-6">{t("loginForFollowing")}</p>
			) : posts.length === 0 ? (
				<p className="mt-16 text-lg text-mlt-dark-6">{emptyMessage()}</p>
			) : (
				<>
					<PostCardList data={posts} />

					{hasMore && (
						<button
							className="_btn orange_invert mx-auto my-8"
							disabled={loadingMore}
							type="button"
							onClick={handleLoadMore}
						>
							{loadingMore ? t("loadingMore") : t("loadMore")}
						</button>
					)}

					{failed && <p className="mb-8 text-center text-sm text-red-600">{t("error")}</p>}
				</>
			)}
		</section>
	);
};

export default Feed;
