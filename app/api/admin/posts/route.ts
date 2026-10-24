/**
 * API for the moderation of the posts. Only the admins (see ADMIN_EMAILS) can use it.
 *
 * GET   /api/admin/posts?status=pending|rejected|approved
 * PATCH /api/admin/posts   body: { id, status: "approved" | "rejected", updatedAt }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { isAdminEmail } from "@/lib/admin";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { PostStatus } from "@/interfaces/Post";
import { POST_POPULATE, toPublicPost } from "@/lib/public-user";
import Post from "@/models/post";

export const dynamic = "force-dynamic";

// Returns an error response if the user is not an admin, otherwise returns null.
async function denyIfNotAdmin() {
	const session = await getServerSession(authOptions);

	if (!session) {
		return NextResponse.json({ error: "Unauthorized!" }, { status: 401 });
	}

	if (!isAdminEmail(session.user?.email)) {
		return NextResponse.json({ error: "Forbidden!" }, { status: 403 });
	}

	return null;
}

export async function GET(request: NextRequest) {
	const denied = await denyIfNotAdmin();

	if (denied) {
		return denied;
	}

	try {
		const status = request.nextUrl.searchParams.get("status") ?? PostStatus.PENDING;

		if (!Object.values(PostStatus).includes(status as PostStatus)) {
			return NextResponse.json({ error: "Invalid status!" }, { status: 400 });
		}

		await connectToMongoDb();

		// The old posts do not have status, they are handled as "pending".
		const filter =
			status === PostStatus.PENDING
				? { status: { $in: [PostStatus.PENDING, null] } }
				: { status };

		// The oldest pending posts are first, the other lists start with the newest posts.
		const posts = await Post.find(filter)
			.sort({ _id: status === PostStatus.PENDING ? 1 : -1 })
			.populate(POST_POPULATE);

		return NextResponse.json({ posts: posts.map(toPublicPost) }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: "Failed to retrieve posts!" }, { status: 500 });
	}
}

export async function PATCH(request: NextRequest) {
	const denied = await denyIfNotAdmin();

	if (denied) {
		return denied;
	}

	try {
		const { id, status, updatedAt } = await request.json();

		if (
			!mongoose.isValidObjectId(id) ||
			![PostStatus.APPROVED, PostStatus.REJECTED].includes(status)
		) {
			return NextResponse.json({ error: "Invalid request!" }, { status: 400 });
		}

		await connectToMongoDb();

		// The decision is valid only for the version of the post that the admin has seen.
		// If the creator has edited the post in the meantime, "updatedAt" is different.
		// The old posts have no "updatedAt" (until they are edited for the first time).
		const filter = updatedAt
			? { _id: id, updatedAt: new Date(updatedAt) }
			: { _id: id, updatedAt: { $exists: false } };

		const post = await Post.findOneAndUpdate(
			filter,
			{ status, moderatedAt: new Date() },
			{ new: true }
		).populate(POST_POPULATE);

		if (!post) {
			const exists = await Post.exists({ _id: id });

			return NextResponse.json(
				{ error: exists ? "The post was changed, reload the list!" : "Post not found!" },
				{ status: exists ? 409 : 404 }
			);
		}

		return NextResponse.json(
			{ message: "Post moderated successfully!", post: toPublicPost(post) },
			{ status: 200 }
		);
	} catch (error) {
		return NextResponse.json({ error: "Failed to moderate the post!" }, { status: 500 });
	}
}
