/**
 * @check the differences with '@/api/posts/[[...id]]/route.ts'
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { isAdminEmail } from "@/lib/admin";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { PostStatus } from "@/interfaces/Post";
import { addSavedCounts } from "@/lib/engagement";
import { POST_POPULATE, toPublicPost } from "@/lib/public-user";
import Post from "@/models/post";

export const dynamic = "force-dynamic";

/**
 * @example fetch(`/api/users/${useId}/posts`)
 */
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
		const canSeeAll = session?.user?.id === userId || isAdminEmail(session?.user?.email);

		// The visitors see only the approved posts of the user.
		// The user himself and the admins see all posts (pending, rejected, approved).
		const filter = canSeeAll
			? { creator: userId }
			: { creator: userId, status: PostStatus.APPROVED };

		const posts = await Post.find(filter).sort({ _id: -1 }).populate(POST_POPULATE);

		return NextResponse.json(
			{ posts: await addSavedCounts(posts.map(toPublicPost)) },
			{ status: 200 }
		);
	} catch (error) {
		return NextResponse.json({ error: "Failed to retrieve posts!" }, { status: 500 });
	}
}
