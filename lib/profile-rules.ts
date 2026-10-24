/**
 * The rules for the profile, used by the form (browser) and by the API (server).
 */
export const NAME_MAX = 50;
export const USERNAME_MIN = 4;
export const USERNAME_MAX = 30;
export const AVATAR_MAX_BYTES = 300 * 1024; // the browser resizes the avatar to 256x256, it is much smaller

const RESERVED_USERNAMES = [
	"admin",
	"administrator",
	"root",
	"support",
	"moderator",
	"moderation",
	"system",
	"staff",
	"help",
	"official",
	"api",
	"me",
	"null",
	"undefined",
];

export type UsernameError =
	| "usernameLength"
	| "usernameChars"
	| "usernameEdges"
	| "usernameReserved";

// Returns the key of the error message (see "Profile.errors" in messages/en.json) or null if it is valid.
export function validateUsername(value: string): UsernameError | null {
	if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
		return "usernameLength";
	}

	if (!/^[a-z0-9._]+$/.test(value)) {
		return "usernameChars";
	}

	// Not at the beginning or at the end, and not two in a row.
	if (/^[._]|[._]$/.test(value) || /[._]{2}/.test(value)) {
		return "usernameEdges";
	}

	if (RESERVED_USERNAMES.includes(value)) {
		return "usernameReserved";
	}

	return null;
}
