/**
 * The AI platforms that can get an "Open in ..." button on a post.
 * To add, remove or fix a platform edit only this file.
 *
 * - "prefillUrl" puts the prompt in the URL, so the platform opens with the prompt typed in.
 *   Not every platform supports this and the platforms can change it at any time.
 * - That is why the prompt is always copied to the clipboard on click (see SharePlatformButtons),
 *   so the user can paste it if the chat box is empty.
 */
export enum SharePlatform {
	CHATGPT = "chatgpt",
	CLAUDE = "claude",
	GEMINI = "gemini",
	GROK = "grok",
	PERPLEXITY = "perplexity",
}

interface SharePlatformConfig {
	name: string;
	openUrl: string; // opened when the prompt can not be put in the URL
	prefillUrl?: (encodedPrompt: string) => string;
}

export const SHARE_PLATFORMS: Record<SharePlatform, SharePlatformConfig> = {
	[SharePlatform.CHATGPT]: {
		name: "ChatGPT",
		openUrl: "https://chatgpt.com/",
		prefillUrl: (q) => `https://chatgpt.com/?q=${q}`,
	},
	[SharePlatform.CLAUDE]: {
		name: "Claude",
		openUrl: "https://claude.ai/new",
		prefillUrl: (q) => `https://claude.ai/new?q=${q}`,
	},
	[SharePlatform.GEMINI]: {
		name: "Gemini",
		openUrl: "https://gemini.google.com/app", // Gemini does not support prefill by URL
	},
	[SharePlatform.GROK]: {
		name: "Grok",
		openUrl: "https://grok.com/",
		prefillUrl: (q) => `https://grok.com/?q=${q}`,
	},
	[SharePlatform.PERPLEXITY]: {
		name: "Perplexity",
		openUrl: "https://www.perplexity.ai/",
		prefillUrl: (q) => `https://www.perplexity.ai/search/?q=${q}`,
	},
};

// A too long URL makes some platforms fail, then only the platform is opened.
const MAX_PREFILL_URL_LENGTH = 6000;

export function getShareUrl(platform: SharePlatform, prompt: string): string {
	const config = SHARE_PLATFORMS[platform];

	if (config.prefillUrl) {
		const url = config.prefillUrl(encodeURIComponent(prompt));

		if (url.length <= MAX_PREFILL_URL_LENGTH) {
			return url;
		}
	}

	return config.openUrl;
}

// Used on the server: keeps only the known platforms, without duplicates.
export function normalizeSharePlatforms(value: unknown): SharePlatform[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const known = Object.values(SharePlatform) as string[];

	return value.filter(
		(item, index, array) => known.includes(item) && array.indexOf(item) === index
	) as SharePlatform[];
}
