/**
 * The numbers for the tab "Statistics" of the admin page (only the admins).
 *
 * GET /api/admin/stats  =>  { totals, daily: [{ date, users, posts }] }   (the last 30 days, Vietnam time)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { PostStatus } from "@/interfaces/Post";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import Post from "@/models/post";
import User from "@/models/user";

export const dynamic = "force-dynamic";

const DAYS = 30;
const TIME_ZONE = "Asia/Ho_Chi_Minh";

// "2026-10-24" (the date in Vietnam) of a moment.
const dayOf = (time: number) => new Date(time).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

type DailyRow = { _id: string; count: number };

export async function GET() {
	const session = await getServerSession(authOptions);

	if (!session) {
		return NextResponse.json({ error: "Unauthorized!" }, { status: 401 });
	}

	if (!isAdminEmail(session.user?.email)) {
		return NextResponse.json({ error: "Forbidden!" }, { status: 403 });
	}

	try {
		await connectToMongoDb();

		const now = Date.now();
		// A little more than 30 days back, the days outside of the list are ignored below.
		const since = mongoose.Types.ObjectId.createFromTime(Math.floor((now - (DAYS + 1) * 86400000) / 1000));

		const daily = (model: unknown) =>
			(model as { aggregate: (pipeline: unknown[]) => Promise<DailyRow[]> }).aggregate([
				{ $match: { _id: { $gte: since } } },
				{
					$group: {
						_id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$_id" }, timezone: TIME_ZONE } },
						count: { $sum: 1 },
					},
				},
			]);

		const [users, posts, usersTotal, blocked, trusted, pending, approved, rejected] = await Promise.all([
			daily(User),
			daily(Post),
			User.countDocuments({}),
			User.countDocuments({ blocked: true }),
			User.countDocuments({ trusted: true }),
			Post.countDocuments({ status: PostStatus.PENDING }),
			Post.countDocuments({ status: PostStatus.APPROVED }),
			Post.countDocuments({ status: PostStatus.REJECTED }),
		]);

		const usersMap = new Map(users.map((row) => [row._id, row.count]));
		const postsMap = new Map(posts.map((row) => [row._id, row.count]));

		const list: { date: string; users: number; posts: number }[] = [];

		for (let i = DAYS - 1; i >= 0; i--) {
			const date = dayOf(now - i * 86400000);

			list.push({ date, users: usersMap.get(date) ?? 0, posts: postsMap.get(date) ?? 0 });
		}

		return NextResponse.json(
			{
				totals: {
					users: usersTotal,
					blocked,
					trusted,
					posts: pending + approved + rejected,
					pending,
					approved,
					rejected,
				},
				daily: list,
			},
			{ status: 200 }
		);
	} catch (error) {
		return NextResponse.json({ error: "Failed to retrieve the statistics!" }, { status: 500 });
	}
}
