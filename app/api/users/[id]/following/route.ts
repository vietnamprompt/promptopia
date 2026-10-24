/**
 * The users that a user follows (public, the e-mails are never sent).
 *
 * GET /api/users/{id}/following   =>  { users: [{ _id, name, username, image }], total }
 */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { PUBLIC_CREATOR_SELECT, toPublicUser } from "@/lib/public-user";
import Follow from "@/models/follow";
import User from "@/models/user";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 100;

interface Context {
	params: { id: string };
}

export async function GET(request: NextRequest, { params }: Context) {
	try {
		const userId = params?.id;

		if (!mongoose.isValidObjectId(userId)) {
			return NextResponse.json({ users: [], total: 0 }, { status: 200 });
		}

		await connectToMongoDb();

		const [rows, total] = await Promise.all([
			Follow.find({ follower: userId })
				.sort({ createdAt: -1 })
				.limit(LIST_LIMIT)
				.populate({ path: "following", model: User, select: PUBLIC_CREATOR_SELECT }),
			Follow.countDocuments({ follower: userId }),
		]);

		const users = (rows as unknown as { following?: { toObject: () => unknown } | null }[])
			.map((row) =>
				row.following
					? toPublicUser(row.following.toObject() as Parameters<typeof toPublicUser>[0])
					: null
			)
			.filter(Boolean);

		return NextResponse.json({ users, total }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ users: [], total: 0 }, { status: 500 });
	}
}
