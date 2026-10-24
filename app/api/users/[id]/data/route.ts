/**
 * @check the differences with '@/api/posts/[[...id]]/route.ts'
 */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { getPublicUsername } from "@/lib/public-user";
import { cleanSocialLinks } from "@/lib/social-links";
import Follow from "@/models/follow";
import User from "@/models/user";

export const dynamic = "force-dynamic";

interface Context {
	params: { id: string };
}

/**
 * The public profile of a user. The account e-mail is never sent (the user can add a public e-mail in his links).
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

		const followersCount = await Follow.countDocuments({ following: user._id });

		return NextResponse.json(
			{
				_id: user._id,
				name: user.name,
				username: getPublicUsername(user),
				image: user.image,
				description: user.description,
				socialLinks: cleanSocialLinks(user.socialLinks),
				followersCount,
				// The visitors see the "Saved" tab only if the user made his saved posts public.
				savedPublic: !!user.savedPublic,
			},
			{ status: 200 }
		);
	} catch (error) {
		return failed();
	}
}
