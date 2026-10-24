/**
 * A title written only with capital letters ("BEST PROMPT FOR LOGO DESIGN") is changed to a normal
 * sentence: only the beginning of the sentence (the start and after . ! ?) and the proper nouns keep
 * the capital letter. A title that already has lower case letters is never changed.
 */

// The proper nouns, names of brands and abbreviations. The admins can add more (Admin > Settings).
export const DEFAULT_PROPER_NOUNS = [
	"AI",
	"ChatGPT",
	"GPT",
	"OpenAI",
	"Midjourney",
	"DALL-E",
	"Gemini",
	"Claude",
	"Copilot",
	"Sora",
	"Google",
	"Facebook",
	"Instagram",
	"TikTok",
	"YouTube",
	"Zalo",
	"Telegram",
	"Canva",
	"Photoshop",
	"Excel",
	"PowerPoint",
	"WordPress",
	"Python",
	"JavaScript",
	"SEO",
	"CEO",
	"API",
	"UI",
	"UX",
	"PDF",
	"CV",
	"HR",
	"SQL",
	"HTML",
	"CSS",
	"Việt Nam",
	"tiếng Anh",
	"tiếng Việt",
	"tiếng Trung",
	"tiếng Nhật",
	"tiếng Hàn",
	"Hà Nội",
	"Hồ Chí Minh",
	"Sài Gòn",
	"Đà Nẵng",
];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Only capital letters (at least 4 letters, so "AI" or "SEO" alone are left as they are). */
export function isShoutingTitle(title: string) {
	const letters = title.replace(/[^\p{L}]/gu, "");

	return letters.length >= 4 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

/** "extraNouns" is a list of proper nouns (the right form, i.e. "ChatGPT"). */
export function fixShoutingTitle(title: string, extraNouns: string[] = []) {
	const text = String(title ?? "").trim();

	if (!isShoutingTitle(text)) {
		return text;
	}

	let result = text.toLowerCase();

	// The longest first, so "Hồ Chí Minh" wins over a shorter word inside of it.
	[...extraNouns, ...DEFAULT_PROPER_NOUNS]
		.map((noun) => noun.trim())
		.filter((noun) => noun.length >= 2)
		.sort((a, b) => b.length - a.length)
		.forEach((noun) => {
			result = result.replace(
				new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(noun.toLowerCase())}(?![\\p{L}\\p{N}])`, "gu"),
				noun
			);
		});

	// The capital letter at the start of the text and after . ! ?
	return result.replace(/(^|[.!?]\s+)(\p{L})/gu, (_match, before: string, letter: string) => {
		return `${before}${letter.toUpperCase()}`;
	});
}
