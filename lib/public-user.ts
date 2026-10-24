import type { PopulateOptions } from "mongoose";

/**
 * Everything that is sent to the visitors about the author of a post goes through this file.
 * The e-mail (and the other private data) is never part of it.
 */
export const PUBLIC_CREATOR_SELECT = "name username usernameChosen image";

export const POST_POPULATE: PopulateOptions[] = [
	{ path: "creator", select: PUBLIC_CREATOR_SELECT },
	{ path: "image" },
];

interface UserLike {
	_id?: unknown;
	name?: string;
	username?: string;
	usernameChosen?: boolean;
	image?: string;
}

// The username that was generated automatically is not published: the old ones were
// created from the e-mail of the user. The visitors see it only after the user chooses one.
export function getPublicUsername(user: UserLike) {
	return user.usernameChosen && user.username
		? user.username
		: `user${String(user._id).slice(-6)}`;
}

export function toPublicUser(user: UserLike | null | undefined) {
	if (!user) {
		return null;
	}

	return {
		_id: user._id,
		name: user.name,
		username: getPublicUsername(user),
		image: user.image,
	};
}

export function toPublicPost(post: { toObject: () => Record<string, unknown> }) {
	const plain = post.toObject();

	return { ...plain, creator: toPublicUser(plain.creator as UserLike | null | undefined) };
}
