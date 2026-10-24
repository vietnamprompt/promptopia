/**
 * @check the differences with '@/api/posts/[[...id]]/route.ts'
 */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { getPublicUsername } from "@/lib/public-user";
import User from "@/models/user";

export const dynamic = "force-dynamic";

interface Context {
	params: { id: string };
}

/**
 * The public profile of a user. The e-mail is sent only if the user has chosen to show it.
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

		return NextResponse.json(
			{
				_id: user._id,
				name: user.name,
				username: getPublicUsername(user),
				image: user.image,
				description: user.description,
				email: user.showEmail ? user.email : undefined,
			},
			{ status: 200 }
		);
	} catch (error) {
		return failed();
	}
}
