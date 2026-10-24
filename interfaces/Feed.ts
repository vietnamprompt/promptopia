/**
 * The tabs of the homepage. The server sorts and cuts the list (see '@/app/api/feed/route.ts'),
 * the browser loads it page by page.
 */
export enum FeedTab {
	NEWEST = "newest",
	TRENDING = "trending", // the most copied in the last 7 days
	TOP = "top", // the most copied of all time
	SAVED = "saved", // the most saved of all time
	FOLLOWING = "following",
}

export const FEED_TABS: FeedTab[] = [
	FeedTab.NEWEST,
	FeedTab.TRENDING,
	FeedTab.TOP,
	FeedTab.SAVED,
	FeedTab.FOLLOWING,
];

// How many posts one request returns.
export const FEED_PAGE_SIZE = 12;

export function parseFeedTab(value: unknown): FeedTab {
	return FEED_TABS.includes(value as FeedTab) ? (value as FeedTab) : FeedTab.NEWEST;
}

/**
 * What the search box looks for, it depends on the first character of the text:
 * "#word" - tags, "@word" - authors, "word" - the title, the description and the prompt.
 */
export enum SearchMode {
	PROMPT = "prompt",
	TAG = "tag",
	AUTHOR = "author",
}

export const SEARCH_PREFIX: Record<SearchMode, string> = {
	[SearchMode.PROMPT]: "",
	[SearchMode.TAG]: "#",
	[SearchMode.AUTHOR]: "@",
};

export function parseSearchText(text: string): { mode: SearchMode; term: string } {
	const trimmed = text.trim();

	if (trimmed.startsWith("#")) {
		return { mode: SearchMode.TAG, term: trimmed.slice(1).trim() };
	}

	if (trimmed.startsWith("@")) {
		return { mode: SearchMode.AUTHOR, term: trimmed.slice(1).trim() };
	}

	return { mode: SearchMode.PROMPT, term: trimmed };
}

export function parseSearchMode(value: unknown): SearchMode {
	return Object.values(SearchMode).includes(value as SearchMode)
		? (value as SearchMode)
		: SearchMode.PROMPT;
}
