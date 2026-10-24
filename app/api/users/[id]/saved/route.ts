/**
 * The posts that a user saved.
 * Private by default: only the user himself can see them, unless he turned on
 * "Show my saved posts on my public profile" in the account settings.
 *
 * GET /api/users/{id}/saved   =>  { posts: [...] }  or  { private: true, posts: [] }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { addSavedCounts } from "@/lib/engagement";
import { PostStatus } from "@/interfaces/Post";
import { POST_POPULATE, toPublicPost } from "@/lib/public-user";
import Post from "@/models/post";
import Save from "@/models/save";
import User from "@/models/user";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 200;

interface Context {
	params: { id: string };
}

export async function GET(request: NextRequest, { params }: Context) {
	try {
		const userId = params?.id;

		if (!mongoose.isValidObjectId(userId)) {
			return NextResponse.json({ posts: [] }, { status: 200 });
		}

		await connectToMongoDb();

		const session = await getServerSession(authOptions);
		const isOwner = session?.user?.id === userId;

		if (!isOwner) {
			const user = await User.findById(userId).select("savedPublic");

			if (!user?.savedPublic) {
				return NextResponse.json({ private: true, posts: [] }, { status: 200 });
			}
		}

		const saves = (await Save.find({ user: userId })
			.sort({ createdAt: -1 })
			.limit(LIST_LIMIT)
			.select("post")
			.lean()) as unknown as { post: unknown }[];

		const order = saves.map((save) => String(save.post));
		const posts = await Post.find({
			_id: { $in: saves.map((save) => save.post) },
			status: PostStatus.APPROVED,
		}).populate(POST_POPULATE);

		// The newest saved first.
		const sorted = (posts as unknown[])
			.map((post) => toPublicPost(post))
			.sort(
				(a, b) =>
					order.indexOf(String((a as { _id?: unknown })._id)) -
					order.indexOf(String((b as { _id?: unknown })._id))
			);

		return NextResponse.json({ posts: await addSavedCounts(sorted) }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: "Failed to retrieve saved posts!" }, { status: 500 });
	}
}
