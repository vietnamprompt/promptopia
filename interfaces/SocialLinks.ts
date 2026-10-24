/**
 * The links that the user can add to the profile (personal website and social networks).
 * To add or remove a network edit only this file (and the badge in '@/components/SocialLinks.tsx').
 */
export const SOCIAL_PLATFORMS = [
	"website",
	"email",
	"facebook",
	"x",
	"zalo",
	"instagram",
	"tiktok",
	"youtube",
	"threads",
	"telegram",
	"github",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialLinksType = Partial<Record<SocialPlatform, string>>;

interface SocialPlatformConfig {
	label: string;
	example: string;
	// The form starts with this text in the field, the user adds only the name after it.
	prefix: string;
	hosts?: string[]; // the link must be on one of these domains (the website can be anywhere)
}

export const SOCIAL_CONFIG: Record<SocialPlatform, SocialPlatformConfig> = {
	website: { label: "Website", example: "https://yourwebsite.com", prefix: "https://" },
	email: { label: "Email", example: "you@example.com", prefix: "" },
	facebook: {
		label: "Facebook",
		example: "https://facebook.com/yourname",
		prefix: "https://facebook.com/",
		hosts: ["facebook.com", "fb.com", "fb.me", "fb.watch"],
	},
	x: {
		label: "X",
		example: "https://x.com/yourname",
		prefix: "https://x.com/",
		hosts: ["x.com", "twitter.com"],
	},
	zalo: {
		label: "Zalo",
		example: "https://zalo.me/0123456789",
		prefix: "https://zalo.me/",
		hosts: ["zalo.me"],
	},
	instagram: {
		label: "Instagram",
		example: "https://instagram.com/yourname",
		prefix: "https://instagram.com/",
		hosts: ["instagram.com", "instagr.am"],
	},
	tiktok: {
		label: "TikTok",
		example: "https://tiktok.com/@yourname",
		prefix: "https://tiktok.com/@",
		hosts: ["tiktok.com"],
	},
	youtube: {
		label: "YouTube",
		example: "https://youtube.com/@yourchannel",
		prefix: "https://youtube.com/@",
		hosts: ["youtube.com", "youtu.be"],
	},
	threads: {
		label: "Threads",
		example: "https://threads.net/@yourname",
		prefix: "https://threads.net/@",
		hosts: ["threads.net", "threads.com"],
	},
	telegram: {
		label: "Telegram",
		example: "https://t.me/yourname",
		prefix: "https://t.me/",
		hosts: ["t.me", "telegram.me", "telegram.dog"],
	},
	github: {
		label: "GitHub",
		example: "https://github.com/yourname",
		prefix: "https://github.com/",
		hosts: ["github.com"],
	},
};

export const SOCIAL_LINK_MAX = 200;
