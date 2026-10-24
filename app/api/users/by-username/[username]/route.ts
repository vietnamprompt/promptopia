/**
 * The public profile of a user, found by the username (the address "/@username").
 *
 * GET /api/users/by-username/{username}  =>  the same data as '/api/users/{id}/data'
 */
import { NextRequest, NextResponse } from "next/server";

import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { findUserByPublicUsername, toPublicProfile } from "@/lib/public-profile";

export const dynamic = "force-dynamic";

interface Context {
	params: { username: string };
}

export async function GET(request: NextRequest, { params }: Context) {
	try {
		const username = decodeURIComponent(String(params?.username ?? "")).replace(/^@/, "");

		await connectToMongoDb();

		const user = await findUserByPublicUsername(username);

		if (!user) {
			return NextResponse.json({ error: "User not found!" }, { status: 404 });
		}

		return NextResponse.json(await toPublicProfile(user), { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: "Failed to retrieve a user!" }, { status: 500 });
	}
}
