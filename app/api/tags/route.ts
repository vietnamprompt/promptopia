/**
 * The tags that are already used in the published posts, the most used first.
 * The form uses them to suggest tags while the user types.
 *
 * GET /api/tags  =>  { tags: [{ tag: "tiktok", count: 12 }, ...] }
 */
import { NextResponse } from "next/server";

import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { PostStatus } from "@/interfaces/Post";
import Post from "@/models/post";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		await connectToMongoDb();

		const rows = await Post.aggregate([
			{ $match: { status: PostStatus.APPROVED } },
			{ $unwind: "$tags" },
			{ $group: { _id: "$tags", count: { $sum: 1 } } },
			{ $sort: { count: -1, _id: 1 } },
			{ $limit: 300 },
		]);

		const tags = rows
			.filter((row) => typeof row._id === "string" && row._id.length > 0)
			.map((row) => ({ tag: row._id as string, count: row.count as number }));

		return NextResponse.json({ tags }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: "Failed to retrieve the tags!" }, { status: 500 });
	}
}
