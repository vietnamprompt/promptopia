/**
 * @check the differences with '@/api/posts/[[...id]]/route.ts'
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { isAdminEmail } from "@/lib/admin";
import { PostStatus } from "@/interfaces/Post";
import Post from "@/models/post";
import Save from "@/models/save";

import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { toPublicProfile } from "@/lib/public-profile";
import User from "@/models/user";

export const dynamic = "force-dynamic";

interface Context {
	params: { id: string };
}

/**
 * The public profile of a user. The account e-mail is never sent (the user can add a public e-mail in his links).
 * @example fetch(`/api/users/${useId}/data`)
 */
export async function GET(request: NextRequest, { params }: Context) {
	const failed = () =>
		NextResponse.json({ error: "Failed to retrieve a user!" }, { status: 200 });

	try {
		const userId = params?.id;

		if (!mongoose.isValidObjectId(userId)) {
			return failed();
		}

		await connectToMongoDb();

		const user = await User.findById(userId);

		if (!user) {
			return failed();
		}

		const profile = await toPublicProfile(user);

		// The numbers in the tabs. The visitors count the approved posts, the owner and the admins all posts.
		// The saved posts are counted only if the user shows them (the owner always).
		const session = await getServerSession(authOptions);
		const isOwner = session?.user?.id === userId;
		const canSeeAll = isOwner || isAdminEmail(session?.user?.email);

		const postsCount = await Post.countDocuments(
			canSeeAll ? { creator: userId } : { creator: userId, status: PostStatus.APPROVED }
		);

		let savedCount: number | undefined;

		if (isOwner || profile.savedPublic) {
			const saves = (await Save.find({ user: userId })
				.select("post")
				.lean()) as unknown as { post: unknown }[];

			savedCount = await Post.countDocuments({
				_id: { $in: saves.map((save) => save.post) },
				status: PostStatus.APPROVED,
			});
		}

		return NextResponse.json({ ...profile, postsCount, savedCount }, { status: 200 });
	} catch (error) {
		return failed();
	}
}
