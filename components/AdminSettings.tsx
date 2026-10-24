"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import logo from "@/public/icons/svg/mlt.promptopia.logo.favicon.svg";
import {
	DEFAULT_SITE_SETTINGS,
	SEO_LOCALES,
	SeoLocale,
	SETTINGS_LIMITS,
	SiteSettings,
} from "@/interfaces/SiteSettings";

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

// The logo is resized (the longest side is 256 px) and saved as PNG, so it stays small and transparent.
async function resizeLogo(file: File, max = 256): Promise<string> {
	const img = await loadImage(file);
	const scale = Math.min(1, max / Math.max(img.width, img.height));
	const canvas = document.createElement("canvas");

	canvas.width = Math.max(1, Math.round(img.width * scale));
	canvas.height = Math.max(1, Math.round(img.height * scale));

	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Canvas is not supported.");
	}

	context.drawImage(img, 0, 0, canvas.width, canvas.height);

	return canvas.toDataURL("image/png");
}

/**
 * The tab "Settings" of the admin page: logo, name of the site, SEO texts and other site-wide texts.
 */
const AdminSettings: React.FC = () => {
	const t = useTranslations("Admin.settings");
	const fileInput = useRef<HTMLInputElement>(null);
	const [settings, setSettings] = useState<SiteSettings | null>(null);
	// undefined = the logo is not changed, null = remove the logo, string = the new logo (data URL)
	const [newLogo, setNewLogo] = useState<string | null | undefined>(undefined);
	const [seoLocale, setSeoLocale] = useState<SeoLocale>("en");
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const response = await fetch("/api/site-settings", { cache: "no-store" });

				setSettings(response.ok ? await response.json() : DEFAULT_SITE_SETTINGS);
			} catch (error) {
				console.error(error);
				setSettings(DEFAULT_SITE_SETTINGS);
			}
		})();
	}, []);

	if (!settings) {
		return null;
	}

	const update = (patch: Partial<SiteSettings>) => setSettings({ ...settings, ...patch });

	const updateSeo = (field: "title" | "description" | "keywords", value: string) =>
		update({ seo: { ...settings.seo, [seoLocale]: { ...settings.seo[seoLocale], [field]: value } } });

	const handleLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		event.target.value = "";

		if (!file) {
			return;
		}

		try {
			const dataUrl = await resizeLogo(file);

			if (dataUrl.length > SETTINGS_LIMITS.logoBytes * 1.3) {
				throw new Error("Too big");
			}

			setNewLogo(dataUrl);
			setMessage(null);
		} catch (error) {
			setMessage({ ok: false, text: t("logoInvalid") });
		}
	};

	const handleSave = async () => {
		if (!settings.siteName.trim()) {
			setMessage({ ok: false, text: t("siteNameRequired") });

			return;
		}

		setBusy(true);
		setMessage(null);

		try {
			const response = await fetch("/api/site-settings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...settings, ...(newLogo !== undefined ? { logo: newLogo } : {}) }),
			});

			if (!response.ok) {
				throw new Error("Failed");
			}

			setMessage({ ok: true, text: t("saved") });
			setTimeout(() => window.location.reload(), 800);
		} catch (error) {
			console.error(error);
			setMessage({ ok: false, text: t("error") });
		} finally {
			setBusy(false);
		}
	};

	const logoSrc = newLogo === null ? logo : newLogo ?? settings.logoUrl ?? logo;
	const seo = settings.seo[seoLocale];

	return (
		<div className="glassmorphism mt-8 flex w-full max-w-2xl flex-col gap-6">
			<h2 className="form_input_title">{t("title")}</h2>

			<div>
				<p className="form_input_title">{t("logo")}</p>

				<div className="mt-2 flex items-center gap-4">
					<Image
						unoptimized
						alt={t("logo")}
						className="h-16 w-16 rounded-lg bg-white object-contain p-1"
						height={64}
						src={logoSrc}
						width={64}
					/>

					<div className="flex flex-col items-start gap-2">
						<input
							ref={fileInput}
							accept="image/png,image/jpeg,image/webp"
							className="hidden"
							type="file"
							onChange={handleLogo}
						/>
						<div className="flex flex-wrap gap-2">
							<button
								className="_btn gray_light"
								disabled={busy}
								type="button"
								onClick={() => fileInput.current?.click()}
							>
								{t("logoChange")}
							</button>
							{(settings.logoUrl || typeof newLogo === "string") && newLogo !== null && (
								<button
									className="_btn gray_light"
									disabled={busy}
									type="button"
									onClick={() => setNewLogo(null)}
								>
									{t("logoRemove")}
								</button>
							)}
						</div>
						<p className="text-xs text-mlt-dark-6">{t("logoHint")}</p>
					</div>
				</div>
			</div>

			<label htmlFor="site-name">
				<span className="form_input_title">{t("siteName")}</span>
				<input
					className="form_input"
					id="site-name"
					maxLength={SETTINGS_LIMITS.siteName}
					value={settings.siteName}
					onChange={(e) => update({ siteName: e.target.value })}
				/>
				<span className="mt-1 block text-xs text-mlt-dark-6">{t("siteNameHint")}</span>
			</label>

			<div>
				<p className="form_input_title">{t("seo")}</p>
				<p className="mt-1 text-xs text-mlt-dark-6">{t("seoHint")}</p>

				<div className="mt-3 flex gap-2">
					{SEO_LOCALES.map((locale) => (
						<button
							key={locale}
							className={`_btn ${seoLocale === locale ? "orange_invert" : "gray_light"}`}
							type="button"
							onClick={() => setSeoLocale(locale)}
						>
							{locale === "en" ? "English" : "Tiếng Việt"}
						</button>
					))}
				</div>

				<label className="mt-3 block" htmlFor="seo-title">
					<span className="text-sm text-mlt-dark-4">{t("seoTitle")}</span>
					<input
						className="form_input !mt-1"
						id="seo-title"
						maxLength={SETTINGS_LIMITS.title}
						value={seo.title}
						onChange={(e) => updateSeo("title", e.target.value)}
					/>
					<span className="text-xs text-mlt-dark-6">
						{t("seoTitleHint")} ({seo.title.length} / {SETTINGS_LIMITS.title})
					</span>
				</label>

				<label className="mt-3 block" htmlFor="seo-description">
					<span className="text-sm text-mlt-dark-4">{t("seoDescription")}</span>
					<textarea
						className="form_input form_textarea !mt-1"
						id="seo-description"
						maxLength={SETTINGS_LIMITS.description}
						rows={3}
						value={seo.description}
						onChange={(e) => updateSeo("description", e.target.value)}
					/>
					<span className="text-xs text-mlt-dark-6">
						{t("seoDescriptionHint")} ({seo.description.length} / {SETTINGS_LIMITS.description})
					</span>
				</label>

				<label className="mt-3 block" htmlFor="seo-keywords">
					<span className="text-sm text-mlt-dark-4">{t("seoKeywords")}</span>
					<input
						className="form_input !mt-1"
						id="seo-keywords"
						maxLength={SETTINGS_LIMITS.keywords}
						value={seo.keywords}
						onChange={(e) => updateSeo("keywords", e.target.value)}
					/>
					<span className="text-xs text-mlt-dark-6">{t("seoKeywordsHint")}</span>
				</label>

				{(seo.title || seo.description) && (
					<div className="mt-4 rounded-lg bg-white p-3">
						<p className="text-xs text-mlt-dark-6">{t("preview")}</p>
						<p className="truncate text-lg text-blue-700">{seo.title || settings.siteName}</p>
						<p className="line-clamp-2 text-sm text-mlt-dark-4">{seo.description}</p>
					</div>
				)}
			</div>

			<label htmlFor="site-verification">
				<span className="form_input_title">{t("verification")}</span>
				<input
					autoComplete="off"
					className="form_input"
					id="site-verification"
					maxLength={SETTINGS_LIMITS.googleVerification}
					value={settings.googleVerification}
					onChange={(e) => update({ googleVerification: e.target.value })}
				/>
				<span className="mt-1 block text-xs text-mlt-dark-6">{t("verificationHint")}</span>
			</label>

			<label htmlFor="site-footer">
				<span className="form_input_title">{t("footer")}</span>
				<input
					className="form_input"
					id="site-footer"
					maxLength={SETTINGS_LIMITS.footerText}
					value={settings.footerText}
					onChange={(e) => update({ footerText: e.target.value })}
				/>
				<span className="mt-1 block text-xs text-mlt-dark-6">{t("footerHint")}</span>
			</label>

			<div>
				<p className="form_input_title">{t("announcement")}</p>

				<label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-mlt-dark-4">
					<input
						checked={settings.announcementEnabled}
						className="h-4 w-4"
						type="checkbox"
						onChange={(e) => update({ announcementEnabled: e.target.checked })}
					/>
					{t("announcementShow")}
				</label>

				<input
					aria-label={t("announcementText")}
					className="form_input"
					maxLength={SETTINGS_LIMITS.announcement}
					placeholder={t("announcementText")}
					value={settings.announcementText}
					onChange={(e) => update({ announcementText: e.target.value })}
				/>
			</div>

			<div>
				<button className="_btn orange_invert" disabled={busy} type="button" onClick={handleSave}>
					{busy ? t("saving") : t("save")}
				</button>
			</div>

			{message && (
				<p className={`text-sm ${message.ok ? "text-green-600" : "text-red-600"}`}>{message.text}</p>
			)}
		</div>
	);
};

export default AdminSettings;
