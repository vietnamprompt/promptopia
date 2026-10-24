/**
 * The profile of the logged in user (only the user himself can read and change it).
 *
 * GET   /api/users/me
 * PATCH /api/users/me   body: { name?, showEmail?, username?, socialLinks? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { SOCIAL_PLATFORMS } from "@/interfaces/SocialLinks";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { NAME_MAX, validateUsername } from "@/lib/profile-rules";
import { cleanSocialLinks, normalizeSocialLink } from "@/lib/social-links";
import User from "@/models/user";

export const dynamic = "force-dynamic";

interface UserDoc {
	_id: unknown;
	email: string;
	name?: string;
	username: string;
	usernameChosen?: boolean;
	image?: string;
	showEmail?: boolean;
	socialLinks?: unknown;
}

function toOwnProfile(user: UserDoc) {
	return {
		_id: String(user._id),
		email: user.email,
		name: user.name,
		username: user.username,
		usernameChosen: !!user.usernameChosen,
		image: user.image,
		showEmail: !!user.showEmail,
		socialLinks: cleanSocialLinks(user.socialLinks),
	};
}

// The messages are in "Profile.errors" in messages/en.json, the browser shows them.
// "field" is the name of the link (or other field) that has the problem.
function fail(errorKey: string, status: number, field?: string) {
	return NextResponse.json({ errorKey, field }, { status });
}

async function getUser() {
	const session = await getServerSession(authOptions);
	const userId = session?.user?.id;

	if (!userId || !mongoose.isValidObjectId(userId)) {
		return null;
	}

	await connectToMongoDb();

	return await User.findById(userId);
}

export async function GET() {
	const user = await getUser();

	if (!user) {
		return fail("generic", 401);
	}

	return NextResponse.json({ user: toOwnProfile(user) }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
	const user = await getUser();

	if (!user) {
		return fail("generic", 401);
	}

	const body = await request.json().catch(() => null);

	if (!body || typeof body !== "object") {
		return fail("generic", 400);
	}

	if ("name" in body) {
		const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";

		if (!name) {
			return fail("nameRequired", 400);
		}

		if (name.length > NAME_MAX) {
			return fail("nameTooLong", 400);
		}

		user.name = name;
	}

	if ("showEmail" in body) {
		user.showEmail = body.showEmail === true;
	}

	if ("socialLinks" in body) {
		const input = (
			body.socialLinks && typeof body.socialLinks === "object" ? body.socialLinks : {}
		) as Record<string, unknown>;
		const cleaned: Record<string, string> = {};

		for (let i = 0; i < SOCIAL_PLATFORMS.length; i++) {
			const platform = SOCIAL_PLATFORMS[i];
			const result = normalizeSocialLink(platform, input[platform]);

			if ("error" in result) {
				return fail("socialLinkInvalid", 400, platform);
			}

			cleaned[platform] = result.value;
		}

		user.set("socialLinks", cleaned);
	}

	// The username can be changed at any time. The profile links use the id of the user,
	// so they do not break. The reserved usernames (admin, root...) are only for the admins.
	if ("username" in body) {
		const username = String(body.username ?? "")
			.trim()
			.toLowerCase();

		if (!(user.usernameChosen && username === user.username)) {
			const invalid = validateUsername(username, { allowReserved: isAdminEmail(user.email) });

			if (invalid) {
				return fail(invalid, 400);
			}

			if (await User.exists({ username, _id: { $ne: user._id } })) {
				return fail("usernameTaken", 409);
			}

			user.username = username;
			user.usernameChosen = true;
		}
	}

	try {
		await user.save();
	} catch (error) {
		// 11000 is the code of the "duplicate key" error, the unique index of the username.
		if ((error as { code?: number })?.code === 11000) {
			return fail("usernameTaken", 409);
		}

		return fail("generic", 500);
	}

	return NextResponse.json({ user: toOwnProfile(user) }, { status: 200 });
}
