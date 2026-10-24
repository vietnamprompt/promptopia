/**
 * The counter of the copies of a prompt.
 *
 * POST /api/copies/{postId}   =>  { counted: boolean, copyCount: number }
 *
 * Rules:
 * - Only the approved posts are counted.
 * - The author of the post is never counted.
 * - One viewer counts once per post per 24 hours. The viewer is the logged in user,
 *   or, for a visitor, a random id that is kept in a cookie.
 *
 * A visitor who deletes the cookie becomes a new viewer, so the counter is a good
 * estimate, not a perfect number.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { PostStatus } from "@/interfaces/Post";
import CopyEvent from "@/models/copy-event";
import CopyMark from "@/models/copy-mark";
import Post from "@/models/post";

export const dynamic = "force-dynamic";

const VIEWER_COOKIE = "pm_viewer";
const VIEWER_COOKIE_FORMAT = /^[a-f0-9-]{36}$/;
const WINDOW_MS = 24 * 60 * 60 * 1000;

interface Context {
	params: { postId: string };
}

// true if this copy has to be counted (the viewer did not copy the post in the last 24 hours).
async function markCopy(postId: string, viewer: string) {
	const now = new Date();

	// The viewer has an old mark: renew it. Only one of two parallel requests can renew it.
	const renewed = await CopyMark.updateOne(
		{ post: postId, viewer, countedAt: { $lt: new Date(now.getTime() - WINDOW_MS) } },
		{ $set: { countedAt: now } }
	);

	if (renewed.modifiedCount === 1) {
		return true;
	}

	// No mark yet: create it. If it exists (a fresh one), the unique index refuses a second one.
	try {
		await CopyMark.create({ post: postId, viewer, countedAt: now });

		return true;
	} catch (error) {
		if ((error as { code?: number })?.code === 11000) {
			return false;
		}

		throw error;
	}
}

export async function POST(request: NextRequest, { params }: Context) {
	const postId = params?.postId;

	if (!mongoose.isValidObjectId(postId)) {
		return NextResponse.json({ error: "Post not found!" }, { status: 404 });
	}

	try {
		await connectToMongoDb();

		const post = (await Post.findOne({ _id: postId, status: PostStatus.APPROVED })
			.select("creator copyCount")
			.lean()) as unknown as { creator?: unknown; copyCount?: number } | null;

		if (!post) {
			return NextResponse.json({ error: "Post not found!" }, { status: 404 });
		}

		const session = await getServerSession(authOptions);
		const userId = session?.user?.id;

		if (userId && String(post.creator) === userId) {
			return NextResponse.json(
				{ counted: false, copyCount: post.copyCount ?? 0 },
				{ status: 200 }
			);
		}

		const cookieValue = request.cookies.get(VIEWER_COOKIE)?.value ?? "";
		const visitorId = VIEWER_COOKIE_FORMAT.test(cookieValue) ? cookieValue : randomUUID();
		const viewer = userId ? `u:${userId}` : `a:${visitorId}`;

		const counted = await markCopy(postId, viewer);
		let copyCount = post.copyCount ?? 0;

		if (counted) {
			const updated = (await Post.findOneAndUpdate(
				{ _id: postId },
				{ $inc: { copyCount: 1 } },
				{ new: true }
			)
				.select("copyCount")
				.lean()) as unknown as { copyCount?: number } | null;

			copyCount = updated?.copyCount ?? copyCount + 1;

			// The "Trending" tab counts these events of the last 7 days.
			await CopyEvent.create({ post: postId });
		}

		const response = NextResponse.json({ counted, copyCount }, { status: 200 });

		if (!userId && visitorId !== cookieValue) {
			response.cookies.set(VIEWER_COOKIE, visitorId, {
				httpOnly: true,
				sameSite: "lax",
				secure: process.env.NODE_ENV === "production",
				maxAge: 365 * 24 * 60 * 60,
				path: "/",
			});
		}

		return response;
	} catch (error) {
		console.error(error);

		return NextResponse.json({ error: "Failed to count the copy!" }, { status: 500 });
	}
}
