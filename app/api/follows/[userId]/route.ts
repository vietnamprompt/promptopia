/**
 * POST   /api/follows/{userId}   follow the user    =>  { following: true,  followersCount }
 * DELETE /api/follows/{userId}   unfollow the user  =>  { following: false, followersCount }
 *
 * Both are safe to repeat (the second call changes nothing).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import Follow from "@/models/follow";
import User from "@/models/user";

export const dynamic = "force-dynamic";

interface Context {
	params: { userId: string };
}

type Ids =
	| { error: NextResponse; me?: undefined; target?: undefined }
	| { error?: undefined; me: string; target: string };

async function getIds(params: Context["params"]): Promise<Ids> {
	const session = await getServerSession(authOptions);
	const me = session?.user?.id;
	const target = params?.userId;

	if (!me || !mongoose.isValidObjectId(me)) {
		return { error: NextResponse.json({ error: "Unauthorized!" }, { status: 401 }) };
	}

	if (!mongoose.isValidObjectId(target)) {
		return { error: NextResponse.json({ error: "User not found!" }, { status: 404 }) };
	}

	if (me === target) {
		return { error: NextResponse.json({ error: "You can not follow yourself!" }, { status: 400 }) };
	}

	return { me, target };
}

export async function POST(request: Request, { params }: Context) {
	const ids = await getIds(params);

	if (ids.error) {
		return ids.error;
	}

	try {
		await connectToMongoDb();

		if (!(await User.exists({ _id: ids.target }))) {
			return NextResponse.json({ error: "User not found!" }, { status: 404 });
		}

		await Follow.updateOne(
			{ follower: ids.me, following: ids.target },
			{ $setOnInsert: { follower: ids.me, following: ids.target, createdAt: new Date() } },
			{ upsert: true }
		);

		const followersCount = await Follow.countDocuments({ following: ids.target });

		return NextResponse.json({ following: true, followersCount }, { status: 200 });
	} catch (error) {
		// 11000: two requests at the same time, the follow already exists.
		if ((error as { code?: number })?.code === 11000) {
			return NextResponse.json({ following: true }, { status: 200 });
		}

		return NextResponse.json({ error: "Failed to follow!" }, { status: 500 });
	}
}

export async function DELETE(request: Request, { params }: Context) {
	const ids = await getIds(params);

	if (ids.error) {
		return ids.error;
	}

	try {
		await connectToMongoDb();

		await Follow.deleteOne({ follower: ids.me, following: ids.target });

		const followersCount = await Follow.countDocuments({ following: ids.target });

		return NextResponse.json({ following: false, followersCount }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: "Failed to unfollow!" }, { status: 500 });
	}
}
