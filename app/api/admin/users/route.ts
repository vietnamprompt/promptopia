/**
 * API for the members. Only the admins (see ADMIN_EMAILS) can use it.
 *
 * GET   /api/admin/users?q=text&page=1   =>  { users: [{ _id, name, username, email, image, blocked, isAdmin, postsCount }], total }
 * PATCH /api/admin/users   body: { id, blocked?: boolean, trusted?: boolean }
 *
 * A blocked member can not sign in, and the API treats the member as not logged in
 * (see 'session()' in 'lib/auth-options.ts').
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { isAdminEmail } from "@/lib/admin";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import Post from "@/models/post";
import User from "@/models/user";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

interface MemberDoc {
	_id: unknown;
	name?: string;
	username?: string;
	email?: string;
	image?: string;
	blocked?: boolean;
	trusted?: boolean;
}

async function denyIfNotAdmin() {
	const session = await getServerSession(authOptions);

	if (!session) {
		return { denied: NextResponse.json({ error: "Unauthorized!" }, { status: 401 }) };
	}

	if (!isAdminEmail(session.user?.email)) {
		return { denied: NextResponse.json({ error: "Forbidden!" }, { status: 403 }) };
	}

	return { denied: null, email: String(session.user?.email) };
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest) {
	const { denied } = await denyIfNotAdmin();

	if (denied) {
		return denied;
	}

	try {
		await connectToMongoDb();

		const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
		const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);

		const filter = q
			? (() => {
					const regex = new RegExp(escapeRegExp(q), "i");

					return { $or: [{ name: regex }, { username: regex }, { email: regex }] };
			  })()
			: {};

		const [rows, total] = await Promise.all([
			User.find(filter)
				.sort({ _id: -1 })
				.skip((page - 1) * PAGE_SIZE)
				.limit(PAGE_SIZE)
				.select("name username email image blocked trusted")
				.lean(),
			User.countDocuments(filter),
		]);

		const members = rows as unknown as MemberDoc[];

		// The number of posts of each listed member (helps to find the spammers).
		const counts = (await Post.aggregate([
			{ $match: { creator: { $in: members.map((member) => member._id) } } },
			{ $group: { _id: "$creator", count: { $sum: 1 } } },
		])) as { _id: unknown; count: number }[];
		const countMap = new Map(counts.map((row) => [String(row._id), row.count]));

		return NextResponse.json(
			{
				users: members.map((member) => ({
					_id: String(member._id),
					name: member.name ?? "",
					username: member.username ?? "",
					email: member.email ?? "",
					image: member.image ?? "",
					blocked: !!member.blocked,
					trusted: !!member.trusted,
					isAdmin: isAdminEmail(member.email),
					postsCount: countMap.get(String(member._id)) ?? 0,
				})),
				total,
				pageSize: PAGE_SIZE,
			},
			{ status: 200 }
		);
	} catch (error) {
		return NextResponse.json({ error: "Failed to retrieve the members!" }, { status: 500 });
	}
}

export async function PATCH(request: NextRequest) {
	const { denied, email } = await denyIfNotAdmin();

	if (denied) {
		return denied;
	}

	try {
		const body = await request.json().catch(() => null);
		const id = String(body?.id ?? "");

		if (!mongoose.isValidObjectId(id) || typeof body?.blocked !== "boolean" && typeof body?.trusted !== "boolean") {
			return NextResponse.json({ error: "Invalid request!" }, { status: 400 });
		}

		await connectToMongoDb();

		const user = await User.findById(id);

		if (!user) {
			return NextResponse.json({ error: "User not found!" }, { status: 404 });
		}

		if (typeof body.blocked === "boolean") {
			// The admins can not be blocked (this also protects the admin himself).
			if (isAdminEmail(user.email) || user.email === email) {
				return NextResponse.json({ error: "This account can not be blocked!" }, { status: 400 });
			}

			user.blocked = body.blocked;
		}

		if (typeof body.trusted === "boolean") {
			user.trusted = body.trusted;
		}

		await user.save();

		return NextResponse.json(
			{ _id: String(user._id), blocked: !!user.blocked, trusted: !!user.trusted },
			{ status: 200 }
		);
	} catch (error) {
		return NextResponse.json({ error: "Failed to update the member!" }, { status: 500 });
	}
}
