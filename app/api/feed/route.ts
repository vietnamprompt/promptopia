/**
 * The posts of the homepage: sorted, filtered and cut on the server, page by page.
 *
 * GET /api/feed?tab=newest|saved30|savedAll|following&page=1&q=text&fields=author,tags,prompt&ai=chat,image
 *   =>  { posts: [...], hasMore: boolean, loginRequired?: boolean }
 *
 * - "newest": the newest first.
 * - "saved30": the most saved in the last 30 days (only the posts saved at least once).
 * - "savedAll": the most saved of all time (only the posts saved at least once).
 * - "following": the newest posts of the users that the logged in user follows.
 * Only the approved posts are returned. The e-mails are never sent.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { PipelineStage } from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { addSavedCounts } from "@/lib/engagement";
import { POST_POPULATE, toPublicPost } from "@/lib/public-user";
import { FEED_PAGE_SIZE, FeedTab, parseFeedTab } from "@/interfaces/Feed";
import { AiCategories, PostStatus, SearchTypes } from "@/interfaces/Post";
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

function parseList<T extends string>(value: string | null, allowed: T[]): T[] {
	return (value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter((item): item is T => (allowed as string[]).includes(item));
}

export async function GET(request: NextRequest) {
	try {
		const params = request.nextUrl.searchParams;

		const tab = parseFeedTab(params.get("tab"));
		const page = Math.min(Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1), MAX_PAGE);
		const query = (params.get("q") ?? "").replace(/^#/, "").trim().slice(0, MAX_QUERY_LENGTH);

		const allFields = Object.values(SearchTypes) as SearchTypes[];
		const fields = parseList(params.get("fields"), allFields);
		const allCategories = Object.values(AiCategories) as AiCategories[];
		const categories = parseList(params.get("ai"), allCategories);

		await connectToMongoDb();

		const match: Record<string, unknown> = { status: PostStatus.APPROVED };

		if (categories.length > 0 && categories.length < allCategories.length) {
			match.aiCategory = { $in: categories };
		}

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

			match.creator = { $in: follows.map((follow) => follow.following) };
		}

		if (query) {
			const regex = { $regex: escapeRegExp(query), $options: "i" };
			const conditions: Record<string, unknown>[] = [];
			const searchFields = fields.length > 0 ? fields : allFields;

			if (searchFields.includes(SearchTypes.AUTHOR)) {
				// The automatic usernames are not public, so they are not searched.
				const authors = (await User.find({
					$or: [{ name: regex }, { usernameChosen: true, username: regex }],
				})
					.select("_id")
					.limit(500)
					.lean()) as unknown as { _id: unknown }[];

				if (authors.length > 0) {
					conditions.push({ creator: { $in: authors.map((author) => author._id) } });
				}
			}

			if (searchFields.includes(SearchTypes.PROMPT)) {
				conditions.push({ prompt: regex }, { title: regex }, { description: regex });
			}

			if (searchFields.includes(SearchTypes.TAGS)) {
				conditions.push({ tags: regex });
			}

			if (conditions.length === 0) {
				return NextResponse.json(EMPTY, { status: 200 });
			}

			match.$or = conditions;
		}

		const pipeline: Record<string, unknown>[] = [{ $match: match }];

		if (tab === FeedTab.SAVED_30_DAYS || tab === FeedTab.SAVED_ALL_TIME) {
			const since = tab === FeedTab.SAVED_30_DAYS ? new Date(Date.now() - 30 * DAY_MS) : null;

			// "rank" is the number of the saves (in the period) of every post.
			pipeline.push(
				{
					$lookup: {
						from: "saves",
						let: { postId: "$_id" },
						pipeline: [
							{
								$match: {
									$expr: { $eq: ["$post", "$$postId"] },
									...(since ? { createdAt: { $gte: since } } : {}),
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
