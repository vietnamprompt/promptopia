/**
 * The posts of the homepage: sorted, filtered and cut on the server, page by page.
 *
 * GET /api/feed?tab=newest|trending|top|saved|following&page=1&q=text&mode=prompt|tag|author
 *   =>  { posts: [...], hasMore: boolean, loginRequired?: boolean }
 *
 * - "newest": the newest first.
 * - "trending": the most copied in the last 7 days (only the posts copied at least once).
 * - "top": the most copied of all time (only the posts copied at least once).
 * - "saved": the most saved of all time (only the posts saved at least once).
 * - "following": the newest posts of the users that the logged in user follows.
 * - "mode" tells what "q" looks for: the prompt (title, description, prompt), a tag or an author.
 * Only the approved posts are returned. The e-mails are never sent.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { PipelineStage } from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { addSavedCounts } from "@/lib/engagement";
import { POST_POPULATE, toPublicPost } from "@/lib/public-user";
import { FEED_PAGE_SIZE, FeedTab, SearchMode, parseFeedTab, parseSearchMode } from "@/interfaces/Feed";
import { PostStatus } from "@/interfaces/Post";
import Follow from "@/models/follow";
import Post from "@/models/post";
import User from "@/models/user";

export const dynamic = "force-dynamic";

const MAX_PAGE = 500;
const MAX_QUERY_LENGTH = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

const EMPTY = { posts: [], hasMore: false };

// The text of the search is used as a plain text, not as a regular expression.
function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
	try {
		const params = request.nextUrl.searchParams;

		const tab = parseFeedTab(params.get("tab"));
		const page = Math.min(Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1), MAX_PAGE);
		const query = (params.get("q") ?? "").replace(/^#/, "").trim().slice(0, MAX_QUERY_LENGTH);

		const mode = parseSearchMode(params.get("mode"));

		await connectToMongoDb();

		const match: Record<string, unknown> = { status: PostStatus.APPROVED };
		// The authors that the posts can have: the followed ones and/or the ones found by the search.
		let creatorIds: unknown[] | null = null;

		if (tab === FeedTab.FOLLOWING) {
			const session = await getServerSession(authOptions);
			const userId = session?.user?.id;

			if (!userId) {
				return NextResponse.json({ ...EMPTY, loginRequired: true }, { status: 200 });
			}

			const follows = (await Follow.find({ follower: userId })
				.select("following")
				.limit(5000)
				.lean()) as unknown as { following: unknown }[];

			if (follows.length === 0) {
				return NextResponse.json(EMPTY, { status: 200 });
			}

			creatorIds = follows.map((follow) => follow.following);
		}

		if (query) {
			const regex = { $regex: escapeRegExp(query), $options: "i" };

			if (mode === SearchMode.TAG) {
				match.tags = regex;
			} else if (mode === SearchMode.AUTHOR) {
				// The automatic usernames are not public, so they are not searched.
				const authors = (await User.find({
					$or: [{ name: regex }, { usernameChosen: true, username: regex }],
				})
					.select("_id")
					.limit(500)
					.lean()) as unknown as { _id: unknown }[];

				const found = authors.map((author) => author._id);
				const foundKeys = new Set(found.map((id) => String(id)));

				creatorIds = creatorIds ? creatorIds.filter((id) => foundKeys.has(String(id))) : found;
			} else {
				match.$or = [
				{ prompt: regex },
				{ title: regex },
				{ description: regex },
				{ "morePrompts.title": regex },
				{ "morePrompts.prompt": regex },
			];
			}
		}

		if (creatorIds) {
			if (creatorIds.length === 0) {
				return NextResponse.json(EMPTY, { status: 200 });
			}

			match.creator = { $in: creatorIds };
		}

		if (tab === FeedTab.TOP) {
			match.copyCount = { $gt: 0 };
		}

		const pipeline: Record<string, unknown>[] = [{ $match: match }];

		if (tab === FeedTab.TRENDING || tab === FeedTab.SAVED) {
			// "rank" is the number of the copies in the last 7 days (trending)
			// or the number of the saves of all time (saved) of every post.
			const isTrending = tab === FeedTab.TRENDING;
			const since = new Date(Date.now() - 7 * DAY_MS);

			pipeline.push(
				{
					$lookup: {
						from: isTrending ? "copyevents" : "saves",
						let: { postId: "$_id" },
						pipeline: [
							{
								$match: {
									$expr: { $eq: ["$post", "$$postId"] },
									...(isTrending ? { at: { $gte: since } } : {}),
								},
							},
							{ $count: "n" },
						],
						as: "rank",
					},
				},
				{ $addFields: { rank: { $ifNull: [{ $arrayElemAt: ["$rank.n", 0] }, 0] } } },
				{ $match: { rank: { $gt: 0 } } },
				{ $sort: { rank: -1, _id: -1 } }
			);
		} else if (tab === FeedTab.TOP) {
			pipeline.push({ $sort: { copyCount: -1, _id: -1 } });
		} else {
			// The id contains the time of the creation, it works also for the old posts.
			pipeline.push({ $sort: { _id: -1 } });
		}

		// One more post than the page size: it tells if there is a next page.
		pipeline.push(
			{ $skip: (page - 1) * FEED_PAGE_SIZE },
			{ $limit: FEED_PAGE_SIZE + 1 },
			{ $project: { _id: 1 } }
		);

		const rows = (await Post.aggregate(
			pipeline as unknown as PipelineStage[]
		)) as unknown as { _id: unknown }[];

		const hasMore = rows.length > FEED_PAGE_SIZE;
		const ids = rows.slice(0, FEED_PAGE_SIZE).map((row) => row._id);

		if (ids.length === 0) {
			return NextResponse.json(EMPTY, { status: 200 });
		}

		const docs = (await Post.find({ _id: { $in: ids } }).populate(POST_POPULATE)) as unknown[];

		const order = ids.map((id) => String(id));
		const sorted = docs
			.map((doc) => toPublicPost(doc))
			.sort(
				(a, b) =>
					order.indexOf(String((a as { _id?: unknown })._id)) -
					order.indexOf(String((b as { _id?: unknown })._id))
			);

		return NextResponse.json({ posts: await addSavedCounts(sorted), hasMore }, { status: 200 });
	} catch (error) {
		console.error(error);

		return NextResponse.json({ error: "Failed to retrieve posts!" }, { status: 500 });
	}
}
