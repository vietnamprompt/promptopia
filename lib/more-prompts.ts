import { MorePrompt, POST_LIMITS } from "@/interfaces/Post";

/** The additional prompts from the request: only the valid ones, no more than the limit. */
export function normalizeMorePrompts(value: unknown): MorePrompt[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((item) => ({
			title: String(item?.title ?? "").trim(),
			prompt: String(item?.prompt ?? ""),
		}))
		.filter((item) => item.prompt.trim() !== "")
		.slice(0, POST_LIMITS.morePromptsMax);
}
