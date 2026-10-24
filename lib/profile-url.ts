import { Path } from "@/interfaces/Path";

/**
 * The public address of a profile: "/@username" (the username is public, see "toPublicUser()").
 * The old address "/user-posts?user_id=..." still works, it is used if the username is missing.
 */
export function profileHref(user: { _id?: string; username?: string }) {
	if (user.username) {
		return `/@${encodeURIComponent(user.username)}`;
	}

	return `${Path.POSTS}?user_id=${user._id ?? ""}`;
}
