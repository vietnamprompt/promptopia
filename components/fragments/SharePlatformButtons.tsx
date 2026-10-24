import React, { useState } from "react";
import { useTranslations } from "next-intl";

import { SharePlatform, SHARE_PLATFORMS, getShareUrl } from "@/interfaces/SharePlatform";

interface Props {
	platforms?: SharePlatform[];
	prompt: string;
}

const SharePlatformButtons: React.FC<Props> = ({ platforms, prompt }) => {
	const t = useTranslations("PostCard");
	const [hint, setHint] = useState("");
	const available = (platforms ?? []).filter((platform) => SHARE_PLATFORMS[platform]);

	if (available.length === 0) {
		return null;
	}

	const handleClick = (platform: SharePlatform) => {
		// The prompt is always copied, because not every AI platform
		// can take it from the URL, then the user just pastes it.
		navigator.clipboard?.writeText(prompt)?.catch(() => undefined);

		const { name, openUrl } = SHARE_PLATFORMS[platform];
		const isPrefilled = getShareUrl(platform, prompt) !== openUrl;

		setHint(isPrefilled ? t("shareCopied") : t("shareCopiedPaste", { platform: name }));
		setTimeout(() => setHint(""), 7000);
	};

	return (
		<div className="-mt-2 mb-4">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-sm text-mlt-dark-6">{t("openIn")}</span>

				{available.map((platform) => (
					<a
						key={platform}
						className="post_button bg-white text-sm"
						href={getShareUrl(platform, prompt)}
						rel="noopener noreferrer"
						target="_blank"
						onClick={() => handleClick(platform)}
					>
						{SHARE_PLATFORMS[platform].name}
					</a>
				))}
			</div>

			{hint && <p className="mt-2 text-xs text-mlt-dark-6">{hint}</p>}
		</div>
	);
};

export default SharePlatformButtons;
