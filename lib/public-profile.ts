import { getPublicUsername } from "@/lib/public-user";
import { cleanSocialLinks } from "@/lib/social-links";
import Follow from "@/models/follow";
import User from "@/models/user";

interface UserDoc {
	_id: unknown;
	name?: string;
	username?: string;
	usernameChosen?: boolean;
	image?: string;
	description?: string;
	socialLinks?: unknown;
	savedPublic?: boolean;
}

/**
 * The public data of a user (a document of Mongoose). The account e-mail and the other
 * private data are never part of it.
 */
export async function toPublicProfile(doc: unknown) {
	const user = doc as UserDoc;

	const [followersCount, followingCount] = await Promise.all([
		Follow.countDocuments({ following: user._id }),
		Follow.countDocuments({ follower: user._id }),
	]);

	return {
		_id: user._id,
		name: user.name,
		username: getPublicUsername(user),
		image: user.image,
		description: user.description,
		socialLinks: cleanSocialLinks(user.socialLinks),
		followersCount,
		followingCount,
		// The visitors see the "Saved" tab only if the user made his saved posts public.
		savedPublic: !!user.savedPublic,
	};
}

/**
 * The profile address is "/@username". The username that the user chose is searched first.
 * The users that did not choose one are shown as "user" + the last 6 characters of their id,
 * the same short name is found here.
 */
export async function findUserByPublicUsername(username: string) {
	const lower = username.trim().toLowerCase();

	if (!lower || lower.length > 84) {
		return null;
	}

	const chosen = await User.findOne({ username: lower, usernameChosen: true });

	if (chosen) {
		return chosen;
	}

	if (/^user[0-9a-f]{6}$/.test(lower)) {
		return await User.findOne({
			usernameChosen: { $ne: true },
			$expr: { $eq: [{ $substrCP: [{ $toString: "$_id" }, 18, 6] }, lower.slice(4)] },
		});
	}

	return null;
}
