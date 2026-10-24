"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useSearchParams, useRouter } from "next/navigation";

import { usePromptopiaContext } from "@/contexts/PromptopiaContext";
import { FEED_TABS, FeedTab } from "@/interfaces/Feed";
import { AiCategories, PostTypeFromDb, SearchTypes } from "@/interfaces/Post";

import { Path } from "@/interfaces/Path";

import PostCardList from "./PostCardList";
import CheckList, { ListItemType } from "./fragments/CheckList";
import PostCardListLoading from "./PostCardListLoading";
import IconEmbedSvg from "./fragments/IconEmbedSvg";

const SEARCH_DELAY_MS = 500;

const Feed: React.FC = () => {
	const t = useTranslations("Feed");
	const tCommon = useTranslations("Common");
	const { session } = usePromptopiaContext();
	const sessionUserId = session?.user?.id;

	const [tab, setTab] = useState<FeedTab>(FeedTab.NEWEST);
	const [searchText, setSearchText] = useState("");
	const [query, setQuery] = useState(""); // the search text after the pause of the typing

	const [posts, setPosts] = useState<PostTypeFromDb[]>([]);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [loginRequired, setLoginRequired] = useState(false);
	const [failed, setFailed] = useState(false);

	const [aiCategories, setAiCategories] = useState<ListItemType[]>(
		Object.values(AiCategories).map((aiCategory) => ({
			label: tCommon(`aiCats.${aiCategory}`),
			checked: true,
			value: aiCategory,
		}))
	);

	const [searchTypes, setSearchTypes] = useState<ListItemType[]>(
		Object.values(SearchTypes).map((searchType) => ({
			label: tCommon(`searchTypes.${searchType}`),
			checked: true,
			value: searchType,
		}))
	);

	const searchParams = useSearchParams();
	const tagId = searchParams.get("tag");
	const wipe = searchParams.get("wipe");
	const router = useRouter();

	// Only the last request is used: a slow old answer must not replace a newer one.
	const requestId = useRef(0);

	const aiKey = aiCategories
		.filter((item) => item.checked)
		.map((item) => item.value)
		.join(",");
	const fieldsKey = searchTypes
		.filter((item) => item.checked)
		.map((item) => item.value)
		.join(",");

	const loadPage = useCallback(
		async (pageNumber: number) => {
			const id = ++requestId.current;

			const params = new URLSearchParams({
				tab,
				page: String(pageNumber),
				q: query,
				fields: fieldsKey,
				ai: aiKey,
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
		[tab, query, fieldsKey, aiKey]
	);

	// The search starts after a pause of the typing.
	useEffect(() => {
		const timeout = setTimeout(() => setQuery(searchText.trim()), SEARCH_DELAY_MS);

		return () => clearTimeout(timeout);
	}, [searchText]);

	// The first page is loaded again when the tab, the search or the filters change
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

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		e.preventDefault();
		setSearchText(e.target.value);
	};

	useEffect(() => {
		if (tagId) {
			setSearchTypes(
				searchTypes.map((searchType) => ({
					...searchType,
					checked: searchType.value === SearchTypes.TAGS,
				}))
			);

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

		setSearchTypes(
			searchTypes.map((searchType) => ({
				...searchType,
				checked: true,
			}))
		);

		setAiCategories(
			aiCategories.map((aiCategory) => ({
				...aiCategory,
				checked: true,
			}))
		);
	};

	useEffect(() => {
		if (wipe) {
			handleWipe();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [wipe]);

	const emptyMessage = () => {
		if (query) {
			return t("noResults");
		}

		switch (tab) {
			case FeedTab.FOLLOWING:
				return t("emptyFollowing");

			case FeedTab.SAVED_30_DAYS:
			case FeedTab.SAVED_ALL_TIME:
				return t("emptySaved");

			default:
				return t("empty");
		}
	};

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
						required
						className="form_input search_input"
						placeholder={t("searchForPlaceholder")}
						type="text"
						value={searchText}
						onChange={handleSearchChange}
					/>
				</div>

				<div className="search_filters_container">
					<CheckList
						handleAssign={setAiCategories}
						icon={{ size: 22, color: "mlt-orange-secondary" }}
						items={aiCategories}
						type="atLeastOneSelected"
					/>

					<CheckList
						handleAssign={setSearchTypes}
						icon={{ size: 22, color: "mlt-orange-primary", type: "radio" }}
						items={searchTypes}
						style={{ justifyContent: "flex-end", paddingRight: "0.25rem" }}
						type="atLeastOneSelected"
					/>
				</div>
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
