import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import logo from "@/public/icons/svg/mlt.promptopia.logo.favicon.svg";
import { usePromptopiaContext } from "@/contexts/PromptopiaContext";
import {
	SOCIAL_CONFIG,
	SOCIAL_LINK_MAX,
	SOCIAL_PLATFORMS,
	SocialPlatform,
} from "@/interfaces/SocialLinks";
import { NAME_MAX, USERNAME_MAX, USERNAME_MIN, validateUsername } from "@/lib/profile-rules";
import { normalizeSocialLink } from "@/lib/social-links";

interface OwnProfile {
	_id: string;
	email: string;
	name?: string;
	username: string;
	usernameChosen: boolean;
	image?: string;
	showEmail: boolean;
	savedPublic: boolean;
	socialLinks?: Record<string, string>;
}

interface Message {
	kind: "ok" | "error";
	key: string; // "Profile.saved" or "Profile.errors.<key>"
	platform?: SocialPlatform; // the link that has the problem
}

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new window.Image();

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("The file is not an image."));
		};
		img.src = url;
	});
}

// The avatar is cropped to a square and resized, so the upload is always small and fast.
async function resizeToSquareJpeg(file: File, size = 256): Promise<Blob> {
	const img = await loadImage(file);
	const side = Math.min(img.width, img.height);
	const canvas = document.createElement("canvas");

	canvas.width = size;
	canvas.height = size;

	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Canvas is not supported.");
	}

	context.drawImage(
		img,
		(img.width - side) / 2,
		(img.height - side) / 2,
		side,
		side,
		0,
		0,
		size,
		size
	);

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("Can not create the image."))),
			"image/jpeg",
			0.85
		);
	});
}

// Every field starts with the domain of the network, the user adds only the name after it.
function withPrefixes(saved?: Record<string, string>) {
	const result: Record<string, string> = {};

	SOCIAL_PLATFORMS.forEach((platform) => {
		result[platform] = saved?.[platform] || SOCIAL_CONFIG[platform].prefix;
	});

	return result;
}

// If the user pastes a whole link into a field that already has the domain, only the pasted link stays.
function cleanTypedLink(platform: SocialPlatform, value: string) {
	const lastStart = value.toLowerCase().lastIndexOf("https://");

	return platform !== "email" && lastStart > 0 ? value.slice(lastStart) : value;
}

const ProfileSettings: React.FC = () => {
	const t = useTranslations("Profile");
	const { session } = usePromptopiaContext();
	const isAdmin = !!session?.user?.isAdmin;
	const fileInput = useRef<HTMLInputElement>(null);
	const [profile, setProfile] = useState<OwnProfile | null>(null);
	const [name, setName] = useState("");
	const [savedPublic, setSavedPublic] = useState(false);
	const [links, setLinks] = useState<Record<string, string>>({});
	const [username, setUsername] = useState("");
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<Message | null>(null);

	const load = useCallback(async () => {
		try {
			const response = await fetch("/api/users/me");

			if (!response.ok) {
				return;
			}

			const { user } = await response.json();

			setProfile(user);
			setName(user.name ?? "");
			setSavedPublic(!!user.savedPublic);
			setLinks(withPrefixes(user.socialLinks));
			setUsername(user.usernameChosen ? user.username : "");
		} catch (error) {
			console.error(error);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	// Reload the page after a change, so the new name, avatar and username are used everywhere.
	const finish = () => {
		setMessage({ kind: "ok", key: "saved" });
		setTimeout(() => window.location.reload(), 800);
	};

	const showError = async (response: Response) => {
		const data = await response.json().catch(() => ({}));
		const field = (SOCIAL_PLATFORMS as readonly string[]).includes(data?.field)
			? (data.field as SocialPlatform)
			: undefined;

		setMessage({ kind: "error", key: data?.errorKey ?? "generic", platform: field });
	};

	const send = async (body: Record<string, unknown>) => {
		setBusy(true);
		setMessage(null);

		try {
			const response = await fetch("/api/users/me", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			if (response.ok) {
				finish();
			} else {
				await showError(response);
			}
		} catch (error) {
			console.error(error);
			setMessage({ kind: "error", key: "generic" });
		} finally {
			setBusy(false);
		}
	};

	const currentUsername = profile?.usernameChosen ? profile.username : "";

	const handleSaveProfile = () => {
		const cleanName = name.replace(/\s+/g, " ").trim();

		if (!cleanName) {
			setMessage({ kind: "error", key: "nameRequired" });

			return;
		}

		// The username is sent only if the user wrote a new one.
		const newUsername = username.trim().toLowerCase();
		const usernameChanged = !!newUsername && newUsername !== currentUsername;

		if (usernameChanged) {
			const invalid = validateUsername(newUsername, { allowReserved: isAdmin });

			if (invalid) {
				setMessage({ kind: "error", key: invalid });

				return;
			}
		}

		const cleanLinks: Record<string, string> = {};

		for (let i = 0; i < SOCIAL_PLATFORMS.length; i++) {
			const platform = SOCIAL_PLATFORMS[i];
			const result = normalizeSocialLink(platform, links[platform] ?? "");

			if ("error" in result) {
				setMessage({ kind: "error", key: "socialLinkInvalid", platform });

				return;
			}

			cleanLinks[platform] = result.value;
		}

		send({
			name: cleanName,
			savedPublic,
			socialLinks: cleanLinks,
			...(usernameChanged ? { username: newUsername } : {}),
		});
	};

	const handleAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		event.target.value = "";

		if (!file) {
			return;
		}

		setBusy(true);
		setMessage(null);

		try {
			const formData = new FormData();

			formData.append("file", await resizeToSquareJpeg(file), "avatar.jpg");

			const response = await fetch("/api/users/me/avatar", {
				method: "POST",
				body: formData,
			});

			if (response.ok) {
				finish();
			} else {
				await showError(response);
			}
		} catch (error) {
			console.error(error);
			setMessage({ kind: "error", key: "avatarType" });
		} finally {
			setBusy(false);
		}
	};

	if (!profile) {
		return null;
	}

	return (
		<div className="glassmorphism mt-8 flex w-full max-w-2xl flex-col gap-6">
			<h2 className="form_input_title">{t("settingsTitle")}</h2>

			<div className="flex items-center gap-4">
				<Image
					unoptimized
					alt={t("altAvatar")}
					className="h-24 w-24 rounded-full bg-white object-cover"
					height={96}
					src={profile.image || logo}
					width={96}
				/>

				<div className="flex flex-col items-start gap-2">
					<input
						ref={fileInput}
						accept="image/*"
						className="hidden"
						type="file"
						onChange={handleAvatar}
					/>
					<button
						className="_btn gray_light"
						disabled={busy}
						type="button"
						onClick={() => fileInput.current?.click()}
					>
						{t("changeAvatar")}
					</button>
					<p className="text-xs text-mlt-dark-6">{t("avatarHint")}</p>
				</div>
			</div>

			<label htmlFor="profile-name">
				<span className="form_input_title">{t("name")}</span>

				<input
					className="form_input"
					id="profile-name"
					maxLength={NAME_MAX}
					placeholder={t("namePlaceholder")}
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</label>

			<div>
				<label htmlFor="profile-username">
					<span className="form_input_title">{t("username")}</span>
				</label>

				{!profile.usernameChosen && (
					<p className="mt-1 text-xs text-mlt-dark-6">{t("usernameNotChosen")}</p>
				)}

				<input
					className="form_input"
					id="profile-username"
					maxLength={USERNAME_MAX}
					placeholder={t("usernamePlaceholder")}
					value={username}
					onChange={(e) => setUsername(e.target.value.toLowerCase())}
				/>
				<p className="mt-1 text-xs text-mlt-dark-6">
					{t("usernameHint", { min: USERNAME_MIN, max: USERNAME_MAX })}
				</p>
			</div>

			<div>
				<p className="form_input_title">{t("savedPosts")}</p>

				<label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-mlt-dark-4">
					<input
						checked={savedPublic}
						className="h-4 w-4"
						type="checkbox"
						onChange={(e) => setSavedPublic(e.target.checked)}
					/>
					{t("savedPublic")}
				</label>
				<p className="mt-1 text-xs text-mlt-dark-6">{t("savedPublicNote")}</p>
			</div>

			<div>
				<p className="form_input_title">{t("links")}</p>
				<p className="mt-1 text-xs text-mlt-dark-6">{t("linksHint")}</p>

				<div className="mt-3 grid gap-3 sm:grid-cols-2">
					{SOCIAL_PLATFORMS.map((platform) => (
						<label
							key={platform}
							className="flex flex-col text-sm text-mlt-dark-4"
							htmlFor={`social-${platform}`}
						>
							{SOCIAL_CONFIG[platform].label}
							<input
								autoComplete="off"
								className="form_input !mt-1"
								id={`social-${platform}`}
								inputMode={platform === "email" ? "email" : "url"}
								maxLength={SOCIAL_LINK_MAX}
								placeholder={SOCIAL_CONFIG[platform].example}
								value={links[platform] ?? ""}
								onChange={(e) =>
									setLinks({ ...links, [platform]: cleanTypedLink(platform, e.target.value) })
								}
							/>
						</label>
					))}
				</div>
			</div>

			<div>
				<button
					className="_btn orange_invert"
					disabled={busy}
					type="button"
					onClick={handleSaveProfile}
				>
					{busy ? t("saving") : t("save")}
				</button>
			</div>

			{message && (
				<p
					className={`text-sm ${
						message.kind === "ok" ? "text-green-600" : "text-red-600"
					}`}
				>
					{message.kind === "ok"
						? t("saved")
						: t(`errors.${message.key === "socialLinkInvalid" && message.platform === "email" ? "emailInvalid" : message.key}`, {
							  platform: message.platform ? SOCIAL_CONFIG[message.platform].label : "",
							  example: message.platform ? SOCIAL_CONFIG[message.platform].example : "",
						  })}
				</p>
			)}
		</div>
	);
};

export default ProfileSettings;
