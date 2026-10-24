import slugify from "slugify";

/**
 * The address of a prompt: "/p/{slug}-{token}", i.e. "/p/cach-tao-video-ke-chuyen-bang-ai-Wtyn2h0Q_ZEI3AKo".
 * - "slug" is made from the title (for people and for Google), it can change when the title changes.
 * - "token" is the id of the post (24 characters) written with 16 characters, it never changes.
 * The post is found by the token only, a wrong or an old slug is corrected by a redirect.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** The id of a post (24 hex characters) -> 16 characters. */
export function encodePostId(hex: string) {
	if (!/^[0-9a-f]{24}$/i.test(hex)) {
		return "";
	}

	let result = "";

	for (let i = 0; i < 24; i += 6) {
		const n = parseInt(hex.slice(i, i + 6), 16); // 3 bytes

		result +=
			ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63] + ALPHABET[(n >> 6) & 63] + ALPHABET[n & 63];
	}

	return result;
}

/** 16 characters -> the id of the post (24 hex characters), or null. */
export function decodePostId(token: string) {
	if (token.length !== 16) {
		return null;
	}

	let hex = "";

	for (let i = 0; i < 16; i += 4) {
		const values = token
			.slice(i, i + 4)
			.split("")
			.map((char) => ALPHABET.indexOf(char));

		if (values.some((value) => value < 0)) {
			return null;
		}

		const n = (values[0] << 18) | (values[1] << 12) | (values[2] << 6) | values[3];

		hex += n.toString(16).padStart(6, "0");
	}

	return hex;
}

export function postSlug(title: unknown) {
	return slugify(String(title ?? ""), { lower: true, strict: true })
		.slice(0, 60)
		.replace(/-+$/, "");
}

/** "/p/{slug}-{token}" (without the language). */
export function postPath(post: { _id: unknown; title?: unknown }) {
	const token = encodePostId(String(post._id));
	const slug = postSlug(post.title);

	return `/p/${slug ? `${slug}-` : ""}${token}`;
}

/** The part of the address after "/p/" -> { id, slug }, or null if it is not an address of a post. */
export function parsePostParam(param: string) {
	let value = param;

	try {
		value = decodeURIComponent(param);
	} catch (error) {
		return null;
	}

	// The old form, the whole id.
	if (/^[0-9a-f]{24}$/i.test(value)) {
		return { id: value.toLowerCase(), slug: null as string | null };
	}

	const id = decodePostId(value.slice(-16));

	if (!id) {
		return null;
	}

	return { id, slug: value.slice(0, -16).replace(/-$/, "") };
}
