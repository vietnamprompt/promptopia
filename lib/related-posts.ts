import mongoose from "mongoose";

import { PostStatus } from "@/interfaces/Post";
import { getPublicUsername, POST_POPULATE } from "@/lib/public-user";
import Post from "@/models/post";

export interface RelatedPost {
	_id: string;
	title: string;
	snippet: string; // the beginning of the prompt
	tags: string[];
	sharedTags: string[]; // the tags that are the same as the tags of the opened prompt
	copyCount: number;
	creator: { username: string; name?: string; image?: string } | null;
}

/**
 * The prompts to read next. The criteria, in this order:
 * 1. the number of the same tags (the more, the higher),
 * 2. how many times the prompt was copied,
 * 3. the newest.
 * If there are fewer than "limit" prompts with a same tag, the list is filled with the most copied prompts.
 */
export async function getRelatedPosts(
	post: { _id: string; tags: string[] },
	limit = 6
): Promise<RelatedPost[]> {
	const selfId = new mongoose.Types.ObjectId(post._id);

	const ranked = (await Post.aggregate([
		{ $match: { status: PostStatus.APPROVED, _id: { $ne: selfId }, tags: { $in: post.tags } } },
		{ $addFields: { sharedCount: { $size: { $setIntersection: ["$tags", post.tags] } } } },
		{ $sort: { sharedCount: -1, copyCount: -1, _id: -1 } },
		{ $limit: limit },
		{ $project: { _id: 1 } },
	])) as { _id: mongoose.Types.ObjectId }[];

	let ids = ranked.map((row) => row._id);

	if (ids.length < limit) {
		const filler = (await Post.find({
			status: PostStatus.APPROVED,
			_id: { $nin: [selfId, ...ids] },
		})
			.sort({ copyCount: -1, _id: -1 })
			.limit(limit - ids.length)
			.select("_id")
			.lean()) as unknown as { _id: mongoose.Types.ObjectId }[];

		ids = [...ids, ...filler.map((row) => row._id)];
	}

	if (ids.length === 0) {
		return [];
	}

	const docs = (await Post.find({ _id: { $in: ids } })
		.select("title prompt tags copyCount creator")
		.populate(POST_POPULATE.filter((item) => item.path === "creator"))
		.lean()) as unknown as {
		_id: mongoose.Types.ObjectId;
		title: string;
		prompt: string;
		tags?: string[];
		copyCount?: number;
		creator?: { _id: unknown; name?: string; username?: string; usernameChosen?: boolean; image?: string } | null;
	}[];

	const byId = new Map(docs.map((doc) => [String(doc._id), doc]));

	return ids
		.map((id) => byId.get(String(id)))
		.filter((doc): doc is NonNullable<typeof doc> => !!doc)
		.map((doc) => ({
			_id: String(doc._id),
			title: doc.title ?? "",
			snippet: String(doc.prompt ?? "").replace(/\s+/g, " ").trim().slice(0, 110),
			tags: doc.tags ?? [],
			sharedTags: (doc.tags ?? []).filter((tag) => post.tags.includes(tag)),
			copyCount: doc.copyCount ?? 0,
			creator: doc.creator
				? { username: getPublicUsername(doc.creator), name: doc.creator.name, image: doc.creator.image }
				: null,
		}));
}
