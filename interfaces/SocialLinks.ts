/**
 * The links that the user can add to the profile (personal website and social networks).
 * To add or remove a network edit only this file (and the badge in '@/components/SocialLinks.tsx').
 */
export const SOCIAL_PLATFORMS = [
	"website",
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
	hosts?: string[]; // the link must be on one of these domains (the website can be anywhere)
}

export const SOCIAL_CONFIG: Record<SocialPlatform, SocialPlatformConfig> = {
	website: { label: "Website", example: "https://yourwebsite.com" },
	facebook: {
		label: "Facebook",
		example: "https://facebook.com/yourname",
		hosts: ["facebook.com", "fb.com", "fb.me", "fb.watch"],
	},
	x: { label: "X", example: "https://x.com/yourname", hosts: ["x.com", "twitter.com"] },
	zalo: { label: "Zalo", example: "https://zalo.me/0123456789", hosts: ["zalo.me"] },
	instagram: {
		label: "Instagram",
		example: "https://instagram.com/yourname",
		hosts: ["instagram.com", "instagr.am"],
	},
	tiktok: { label: "TikTok", example: "https://tiktok.com/@yourname", hosts: ["tiktok.com"] },
	youtube: {
		label: "YouTube",
		example: "https://youtube.com/@yourchannel",
		hosts: ["youtube.com", "youtu.be"],
	},
	threads: {
		label: "Threads",
		example: "https://threads.net/@yourname",
		hosts: ["threads.net", "threads.com"],
	},
	telegram: {
		label: "Telegram",
		example: "https://t.me/yourname",
		hosts: ["t.me", "telegram.me", "telegram.dog"],
	},
	github: { label: "GitHub", example: "https://github.com/yourname", hosts: ["github.com"] },
};

export const SOCIAL_LINK_MAX = 200;
