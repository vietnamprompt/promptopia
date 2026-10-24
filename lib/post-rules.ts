import { NextResponse } from "next/server";

import { PostStatus } from "@/interfaces/Post";
import { getSiteSettings } from "@/lib/site-settings";
import Post from "@/models/post";
import User from "@/models/user";

/** Lower case and without the accents, so "Cấm" and "cam" are the same. */
export function normalizeForMatch(text: string) {
	return text
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "d")
		.toLowerCase();
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Looks for a banned word (the whole word or phrase, no matter the case and the accents).
 * "fields" are the texts to check, i.e. { title, description, prompt, tags }.
 */
export function findBannedWord(fields: Record<string, unknown>, bannedWords: string) {
	const words = bannedWords
		.split(/[\n,]+/)
		.map((raw) => raw.trim())
		.filter((raw) => raw.length >= 2)
		.map((raw) => ({
			raw,
			regex: new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizeForMatch(raw))}([^a-z0-9]|$)`),
		}));

	if (words.length === 0) {
		return null;
	}

	for (const [field, value] of Object.entries(fields)) {
		const text = normalizeForMatch(Array.isArray(value) ? value.join(" ") : String(value ?? ""));

		for (const word of words) {
			if (word.regex.test(text)) {
				return { field, word: word.raw };
			}
		}
	}

	return null;
}

export async function checkBannedWords(fields: Record<string, unknown>) {
	const settings = await getSiteSettings();

	return findBannedWord(fields, settings.bannedWords);
}

/** The answer of the API when a banned word is found. The form shows the message under the field. */
export function bannedPostResponse(found: { field: string; word: string }) {
	return NextResponse.json(
		{
			errors: {
				[found.field]: {
					message: `Nội dung có từ không được phép / Contains a banned word: "${found.word}"`,
				},
			},
		},
		{ status: 400 }
	);
}

/**
 * The status of a new or edited post: the posts of the admins and of the trusted members are approved
 * at once, the posts of the members that have enough approved posts too (see the settings of the site).
 * The other posts wait for an admin.
 */
export async function decidePostStatus(userId: string, isAdmin: boolean): Promise<PostStatus> {
	if (isAdmin) {
		return PostStatus.APPROVED;
	}

	const user = (await User.findById(userId).select("trusted").lean()) as unknown as {
		trusted?: boolean;
	} | null;

	if (user?.trusted) {
		return PostStatus.APPROVED;
	}

	const { autoApproveAfter } = await getSiteSettings();

	if (autoApproveAfter > 0) {
		const approved = await Post.countDocuments({ creator: userId, status: PostStatus.APPROVED });

		if (approved >= autoApproveAfter) {
			return PostStatus.APPROVED;
		}
	}

	return PostStatus.PENDING;
}
