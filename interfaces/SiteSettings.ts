/**
 * The settings of the site, edited by the admins (page "Admin" > "Settings").
 * This file is used by the browser and by the server, so it does not import the database.
 */
export const SEO_LOCALES = ["en", "vi"] as const;
export type SeoLocale = (typeof SEO_LOCALES)[number];

export interface SeoText {
	title: string;
	description: string;
	keywords: string;
}

export interface SiteSettings {
	siteName: string;
	footerText: string;
	googleVerification: string;
	announcementEnabled: boolean;
	announcementText: string;
	// Posts of a member who has this number of approved posts are approved automatically (0 = off).
	autoApproveAfter: number;
	// The words that are not allowed in the posts and in the profiles, one per line.
	bannedWords: string;
	seo: Record<SeoLocale, SeoText>;
	logoUrl: string | null; // null = the default logo
}

export const SETTINGS_LIMITS = {
	siteName: 60,
	footerText: 120,
	googleVerification: 120,
	announcement: 200,
	bannedWords: 3000,
	autoApproveMax: 100,
	title: 70,
	description: 300,
	keywords: 300,
	logoBytes: 250 * 1024,
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
	siteName: "promt84.com",
	footerText: "©2026",
	googleVerification: "",
	announcementEnabled: false,
	announcementText: "",
	autoApproveAfter: 0,
	bannedWords: "",
	seo: {
		en: { title: "", description: "", keywords: "" },
		vi: { title: "", description: "", keywords: "" },
	},
	logoUrl: null,
};

interface StoredSettings {
	siteName?: string;
	footerText?: string;
	googleVerification?: string;
	announcementEnabled?: boolean;
	announcementText?: string;
	autoApproveAfter?: number;
	bannedWords?: string;
	seo?: Partial<Record<SeoLocale, Partial<SeoText>>>;
	logoVersion?: number;
}

/** The stored document (or nothing) -> the full settings, the missing values are the defaults. */
export function normalizeSettings(doc?: StoredSettings | null): SiteSettings {
	const d = DEFAULT_SITE_SETTINGS;
	const seoOf = (locale: SeoLocale): SeoText => ({
		title: doc?.seo?.[locale]?.title ?? "",
		description: doc?.seo?.[locale]?.description ?? "",
		keywords: doc?.seo?.[locale]?.keywords ?? "",
	});

	return {
		siteName: doc?.siteName?.trim() || d.siteName,
		footerText: doc?.footerText ?? d.footerText,
		googleVerification: doc?.googleVerification ?? "",
		announcementEnabled: !!doc?.announcementEnabled,
		announcementText: doc?.announcementText ?? "",
		autoApproveAfter: Math.max(0, Math.floor(Number(doc?.autoApproveAfter) || 0)),
		bannedWords: doc?.bannedWords ?? "",
		seo: { en: seoOf("en"), vi: seoOf("vi") },
		logoUrl: doc?.logoVersion ? `/api/site-settings/logo?v=${doc.logoVersion}` : null,
	};
}
