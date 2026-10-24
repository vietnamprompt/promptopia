/**
 * The users that the logged in user follows (only the ids, the browser keeps them to show
 * the state of the "Follow" buttons).
 *
 * GET /api/follows   =>  { ids: string[] }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import Follow from "@/models/follow";

export const dynamic = "force-dynamic";

export async function GET() {
	const session = await getServerSession(authOptions);
	const userId = session?.user?.id;

	if (!userId || !mongoose.isValidObjectId(userId)) {
		return NextResponse.json({ ids: [] }, { status: 200 });
	}

	try {
		await connectToMongoDb();

		const rows = await Follow.find({ follower: userId }).select("following").limit(5000).lean();

		return NextResponse.json(
			{ ids: rows.map((row: { following: unknown }) => String(row.following)) },
			{ status: 200 }
		);
	} catch (error) {
		return NextResponse.json({ ids: [] }, { status: 500 });
	}
}
