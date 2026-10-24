/**
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/route
 * @see Ref: https://youtu.be/wm5gMKuwSYk?t=7699
 *
 * Moderation rules implemented in this file:
 * - GET (list) returns only the posts with status "approved".
 * - GET (single post) returns a not approved post only to its creator and to the admins.
 * - POST always creates a "pending" post, the creator is always the logged in user.
 * - PUT/PATCH are allowed only for the creator, the edited post becomes "pending" again.
 * - DELETE is allowed for the creator and for the admins.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { isAdminEmail } from "@/lib/admin";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { PostStatus } from "@/interfaces/Post";
import { normalizeMorePrompts } from "@/lib/more-prompts";
import {
	bannedPostResponse,
	checkBannedWords,
	cleanMorePrompts,
	decidePostStatus,
	fixTitle,
} from "@/lib/post-rules";
import { POST_POPULATE, toPublicPost } from "@/lib/public-user";
import { normalizeSharePlatforms } from "@/interfaces/SharePlatform";
import { addSavedCounts } from "@/lib/engagement";
import Post from "@/models/post";
import Save from "@/models/save";

export const dynamic = "force-dynamic";

interface Context {
	params: { id?: string[] };
}

function getPostId(params: Context["params"]) {
	return params?.id?.[0];
}

async function getUserInfo() {
	const session = await getServerSession(authOptions);

	return {
		userId: session?.user?.id,
		isAdmin: isAdminEmail(session?.user?.email),
	};
}

export async function GET(request: NextRequest, { params }: Context) {
	try {
		await connectToMongoDb();

		const postId = getPostId(params);

		// The list of posts: only the approved posts are public.
		if (!postId) {
			// The homepage uses '/api/feed' (page by page), this list is limited.
			const posts = await Post.find({ status: PostStatus.APPROVED })
				.sort({ _id: -1 })
				.limit(100)
				.populate(POST_POPULATE);

			return NextResponse.json(
				{ posts: await addSavedCounts(posts.map(toPublicPost)) },
				{ status: 200 }
			);
		}

		if (!mongoose.isValidObjectId(postId)) {
			return NextResponse.json({ posts: [] }, { status: 200 });
		}

		const post = await Post.findOne({ _id: postId }).populate(POST_POPULATE);

		if (!post) {
			return NextResponse.json({ posts: [] }, { status: 200 });
		}

		// A single post that is not approved is visible only for its creator and for the admins.
		if (post.status !== PostStatus.APPROVED) {
			const { userId, isAdmin } = await getUserInfo();
			const creatorId = String(post.creator?._id ?? post.creator);

			if (!isAdmin && creatorId !== userId) {
				return NextResponse.json({ posts: [] }, { status: 200 });
			}
		}

		return NextResponse.json(
			{ posts: await addSavedCounts([toPublicPost(post)]) },
			{ status: 200 }
		);
	} catch (error) {
		return NextResponse.json({ error: "Failed to retrieve posts!" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	const { userId, isAdmin } = await getUserInfo();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized!" }, { status: 401 });
	}

	try {
		const { title, description, prompt, tags, aiCategory, link, image, sharePlatforms, morePrompts } =
			await request.json();

		await connectToMongoDb();

		const banned = await checkBannedWords({
			title,
			description,
			prompt,
			tags,
			morePrompts: normalizeMorePrompts(morePrompts).map((item) => `${item.title} ${item.prompt}`),
		});

		if (banned) {
			return bannedPostResponse(banned);
		}

		// The creator and the status are never taken from the request body.
		const newPost = new Post({
			creator: userId,
			title: await fixTitle(title),
			description,
			sharePlatforms: normalizeSharePlatforms(sharePlatforms),
			prompt,
			morePrompts: await cleanMorePrompts(morePrompts),
			tags,
			aiCategory,
			link,
			image,
			status: await decidePostStatus(userId, isAdmin),
		});

		await newPost.save();
		await newPost.populate(POST_POPULATE);

		return NextResponse.json(
			{ message: "Prompt created successfully!", post: toPublicPost(newPost) },
			{ status: 201 }
		);
	} catch (error) {
		return NextResponse.json(error, { status: 500 });
	}
}

async function updatePost(request: NextRequest, { params }: Context) {
	const { userId, isAdmin } = await getUserInfo();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized!" }, { status: 401 });
	}

	const postId = getPostId(params);

	if (!postId || !mongoose.isValidObjectId(postId)) {
		return NextResponse.json({ error: "Post not found!" }, { status: 404 });
	}

	try {
		const { title, description, prompt, tags, aiCategory, link, image, sharePlatforms, morePrompts } =
			await request.json();

		await connectToMongoDb();

		const banned = await checkBannedWords({
			title,
			description,
			prompt,
			tags,
			morePrompts: normalizeMorePrompts(morePrompts).map((item) => `${item.title} ${item.prompt}`),
		});

		if (banned) {
			return bannedPostResponse(banned);
		}

		const post = await Post.findOne({ _id: postId });

		if (!post) {
			return NextResponse.json({ error: "Post not found!" }, { status: 404 });
		}

		// Only the creator can edit the post.
		if (String(post.creator) !== userId) {
			return NextResponse.json({ error: "Forbidden!" }, { status: 403 });
		}

		// An edited post must be approved again by an admin (unless the creator is an admin or is trusted).
		post.set({
			title: await fixTitle(title),
			description,
			sharePlatforms: normalizeSharePlatforms(sharePlatforms),
			prompt,
			morePrompts: await cleanMorePrompts(morePrompts),
			tags,
			aiCategory,
			link,
			image,
			status: await decidePostStatus(userId, isAdmin),
		});

		await post.save();
		await post.populate(POST_POPULATE);

		return NextResponse.json(
			{ message: "Post updated successfully!", post: toPublicPost(post) },
			{ status: 200 }
		);
	} catch (error) {
		if (error instanceof mongoose.Error.ValidationError) {
			return NextResponse.json(error, { status: 400 });
		}

		return NextResponse.json({ error: "Failed to update post!" }, { status: 500 });
	}
}

export const PUT = updatePost;
export const PATCH = updatePost;

export async function DELETE(request: NextRequest, { params }: Context) {
	const { userId, isAdmin } = await getUserInfo();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized!" }, { status: 401 });
	}

	const postId = getPostId(params);

	if (!postId || !mongoose.isValidObjectId(postId)) {
		return NextResponse.json({ error: "Post not found!" }, { status: 404 });
	}

	try {
		await connectToMongoDb();

		const post = await Post.findOne({ _id: postId });

		if (!post) {
			return NextResponse.json({ error: "Post not found!" }, { status: 404 });
		}

		if (!isAdmin && String(post.creator) !== userId) {
			return NextResponse.json({ error: "Forbidden!" }, { status: 403 });
		}

		await Post.deleteOne({ _id: postId });
		// Nobody can keep a deleted post in the saved list.
		await Save.deleteMany({ post: postId });

		return NextResponse.json({ message: "Post deleted successfully!" }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: "Failed to delete post!" }, { status: 500 });
	}
}
