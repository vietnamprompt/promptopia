/**
 * https://yoursite/sitemap.xml - the list of the pages for Google. It is built automatically:
 * the homepage in both languages and the profiles ("/@username") of the members that have approved posts.
 */
import type { MetadataRoute } from "next";

import { PostStatus } from "@/interfaces/Post";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { postPath } from "@/lib/post-url";
import Post from "@/models/post";
import User from "@/models/user";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = String(process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
	const now = new Date();

	const pages: MetadataRoute.Sitemap = [
		{ url: `${base}/en`, lastModified: now, changeFrequency: "daily", priority: 1 },
		{ url: `${base}/vi`, lastModified: now, changeFrequency: "daily", priority: 1 },
	];

	try {
		await connectToMongoDb();

		const authors = (await Post.aggregate([
			{ $match: { status: PostStatus.APPROVED } },
			{ $group: { _id: "$creator", last: { $max: "$updatedAt" } } },
			{ $limit: 5000 },
		])) as { _id: unknown; last?: Date }[];

		const users = (await User.find({
			_id: { $in: authors.map((author) => author._id) },
			usernameChosen: true,
			blocked: { $ne: true },
		})
			.select("username")
			.lean()) as unknown as { _id: unknown; username: string }[];

		const lastById = new Map(authors.map((author) => [String(author._id), author.last]));

		users.forEach((user) => {
			pages.push({
				url: `${base}/@${encodeURIComponent(user.username)}`,
				lastModified: lastById.get(String(user._id)) ?? now,
				changeFrequency: "weekly",
				priority: 0.6,
			});
		});

		// Every approved prompt has its own page. The Vietnamese address is listed, it is the main one.
		const posts = (await Post.find({ status: PostStatus.APPROVED })
			.sort({ _id: -1 })
			.limit(10000)
			.select("title updatedAt")
			.lean()) as unknown as { _id: unknown; title?: string; updatedAt?: Date }[];

		posts.forEach((post) => {
			pages.push({
				url: `${base}/vi${postPath(post)}`,
				lastModified: post.updatedAt ?? now,
				changeFrequency: "weekly",
				priority: 0.8,
			});
		});
	} catch (error) {
		console.error(error);
	}

	return pages;
}
