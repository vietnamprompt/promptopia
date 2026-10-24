/**
 * POST   /api/saves/{postId}   save the post    =>  { saved: true,  savedCount }
 * DELETE /api/saves/{postId}   unsave the post  =>  { saved: false, savedCount }
 *
 * Only an approved post can be saved. Both calls are safe to repeat.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { PostStatus } from "@/interfaces/Post";
import Post from "@/models/post";
import Save from "@/models/save";

export const dynamic = "force-dynamic";

interface Context {
	params: { postId: string };
}

type Ids =
	| { error: NextResponse; me?: undefined; post?: undefined }
	| { error?: undefined; me: string; post: string };

async function getIds(params: Context["params"]): Promise<Ids> {
	const session = await getServerSession(authOptions);
	const me = session?.user?.id;
	const post = params?.postId;

	if (!me || !mongoose.isValidObjectId(me)) {
		return { error: NextResponse.json({ error: "Unauthorized!" }, { status: 401 }) };
	}

	if (!mongoose.isValidObjectId(post)) {
		return { error: NextResponse.json({ error: "Post not found!" }, { status: 404 }) };
	}

	return { me, post };
}

export async function POST(request: Request, { params }: Context) {
	const ids = await getIds(params);

	if (ids.error) {
		return ids.error;
	}

	try {
		await connectToMongoDb();

		if (!(await Post.exists({ _id: ids.post, status: PostStatus.APPROVED }))) {
			return NextResponse.json({ error: "Post not found!" }, { status: 404 });
		}

		await Save.updateOne(
			{ user: ids.me, post: ids.post },
			{ $setOnInsert: { user: ids.me, post: ids.post, createdAt: new Date() } },
			{ upsert: true }
		);

		const savedCount = await Save.countDocuments({ post: ids.post });

		return NextResponse.json({ saved: true, savedCount }, { status: 200 });
	} catch (error) {
		// 11000: two requests at the same time, the post is already saved.
		if ((error as { code?: number })?.code === 11000) {
			return NextResponse.json({ saved: true }, { status: 200 });
		}

		return NextResponse.json({ error: "Failed to save!" }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: Context) {
	const ids = await getIds(params);

	if (ids.error) {
		return ids.error;
	}

	try {
		await connectToMongoDb();

		await Save.deleteOne({ user: ids.me, post: ids.post });

		const savedCount = await Save.countDocuments({ post: ids.post });

		return NextResponse.json({ saved: false, savedCount }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: "Failed to unsave!" }, { status: 500 });
	}
}
