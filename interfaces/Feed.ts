/**
 * The tabs of the homepage. The server sorts and cuts the list (see '@/app/api/feed/route.ts'),
 * the browser loads it page by page.
 */
export enum FeedTab {
	NEWEST = "newest",
	SAVED_30_DAYS = "saved30",
	SAVED_ALL_TIME = "savedAll",
	FOLLOWING = "following",
}

export const FEED_TABS: FeedTab[] = [
	FeedTab.NEWEST,
	FeedTab.SAVED_30_DAYS,
	FeedTab.SAVED_ALL_TIME,
	FeedTab.FOLLOWING,
];

// How many posts one request returns.
export const FEED_PAGE_SIZE = 12;

export function parseFeedTab(value: unknown): FeedTab {
	return FEED_TABS.includes(value as FeedTab) ? (value as FeedTab) : FeedTab.NEWEST;
}
