/**
 * The posts that the logged in user saved (only the ids, the browser keeps them to show
 * the state of the "Save" buttons).
 *
 * GET /api/saves   =>  { ids: string[] }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import Save from "@/models/save";

export const dynamic = "force-dynamic";

export async function GET() {
	const session = await getServerSession(authOptions);
	const userId = session?.user?.id;

	if (!userId || !mongoose.isValidObjectId(userId)) {
		return NextResponse.json({ ids: [] }, { status: 200 });
	}

	try {
		await connectToMongoDb();

		const rows = (await Save.find({ user: userId })
			.select("post")
			.limit(5000)
			.lean()) as unknown as { post: unknown }[];

		return NextResponse.json({ ids: rows.map((row) => String(row.post)) }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ ids: [] }, { status: 500 });
	}
}
