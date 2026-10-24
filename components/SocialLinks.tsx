import React from "react";

import {
	SOCIAL_CONFIG,
	SOCIAL_PLATFORMS,
	SocialLinksType,
	SocialPlatform,
} from "@/interfaces/SocialLinks";

/**
 * The icons of the links of a user. Every icon is a small round badge in the color of the network.
 * To use the official logos, replace the content of a badge with an <svg> or an <Image>.
 */
const BADGES: Record<SocialPlatform, { background: string; content: React.ReactNode }> = {
	website: {
		background: "#8b5cf6",
		content: (
			<svg
				className="h-5 w-5"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				viewBox="0 0 24 24"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="2" x2="22" y1="12" y2="12" />
				<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
			</svg>
		),
	},
	facebook: { background: "#1877f2", content: <span className="text-lg">f</span> },
	x: { background: "#000000", content: <span>X</span> },
	zalo: { background: "#0068ff", content: <span className="text-[10px]">Zalo</span> },
	instagram: {
		background: "linear-gradient(45deg, #f09433, #dc2743, #bc1888)",
		content: <span>Ig</span>,
	},
	tiktok: { background: "#000000", content: <span>Tk</span> },
	youtube: {
		background: "#ff0000",
		content: (
			<svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
				<path d="M8 5v14l11-7z" />
			</svg>
		),
	},
	threads: { background: "#000000", content: <span className="text-lg">@</span> },
	telegram: {
		background: "#26a5e4",
		content: (
			<svg
				className="h-4 w-4"
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				viewBox="0 0 24 24"
			>
				<line x1="22" x2="11" y1="2" y2="13" />
				<polygon points="22 2 15 22 11 13 2 9 22 2" />
			</svg>
		),
	},
	github: { background: "#181717", content: <span>GH</span> },
};

interface Props {
	links?: SocialLinksType;
}

const SocialLinks: React.FC<Props> = ({ links }) => {
	// Only safe links are shown as links.
	const items = SOCIAL_PLATFORMS.filter((platform) => links?.[platform]?.startsWith("https://"));

	if (items.length === 0) {
		return null;
	}

	return (
		<div className="mt-1 flex flex-wrap gap-2">
			{items.map((platform) => (
				<a
					key={platform}
					aria-label={SOCIAL_CONFIG[platform].label}
					className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold !text-white drop-shadow transition-transform hover:scale-110"
					href={links?.[platform]}
					rel="noopener noreferrer nofollow ugc"
					style={{ background: BADGES[platform].background }}
					target="_blank"
					title={SOCIAL_CONFIG[platform].label}
				>
					{BADGES[platform].content}
				</a>
			))}
		</div>
	);
};

export default SocialLinks;
