import {
	SOCIAL_CONFIG,
	SOCIAL_LINK_MAX,
	SOCIAL_PLATFORMS,
	SocialLinksType,
	SocialPlatform,
} from "@/interfaces/SocialLinks";

/**
 * Checks and cleans a link of the profile, used by the form (browser) and by the API (server).
 * - an empty value is valid (it removes the link);
 * - only https links are accepted ("http" is changed to "https"), no "javascript:" and so on;
 * - the social networks must be on their own domains.
 */
export function normalizeSocialLink(
	platform: SocialPlatform,
	input: unknown
): { value: string } | { error: true } {
	const raw = typeof input === "string" ? input.trim() : "";

	if (!raw) {
		return { value: "" };
	}

	if (raw.length > SOCIAL_LINK_MAX) {
		return { error: true };
	}

	// The user can type the link without "https://".
	const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
	let url: URL;

	try {
		url = new URL(withProtocol);
	} catch (error) {
		return { error: true };
	}

	if (url.protocol !== "https:" && url.protocol !== "http:") {
		return { error: true };
	}

	if (url.username || url.password) {
		return { error: true };
	}

	const host = url.hostname.toLowerCase();

	if (!host.includes(".")) {
		return { error: true };
	}

	const hosts = SOCIAL_CONFIG[platform].hosts;

	if (hosts && !hosts.some((item) => host === item || host.endsWith(`.${item}`))) {
		return { error: true };
	}

	url.protocol = "https:";

	return { value: url.toString() };
}

// Takes only the known links with a value, from the data of the database.
export function cleanSocialLinks(raw: unknown): SocialLinksType {
	const source = (raw ?? {}) as Record<string, unknown>;
	const result: SocialLinksType = {};

	SOCIAL_PLATFORMS.forEach((platform) => {
		const value = source[platform];

		if (typeof value === "string" && value) {
			result[platform] = value;
		}
	});

	return result;
}
