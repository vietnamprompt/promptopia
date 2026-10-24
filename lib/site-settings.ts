import { unstable_cache } from "next/cache";

import { DEFAULT_SITE_SETTINGS, normalizeSettings, SiteSettings } from "@/interfaces/SiteSettings";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import SiteSettingsModel from "@/models/site-settings";

async function loadSiteSettings(): Promise<SiteSettings> {
	try {
		await connectToMongoDb();

		const doc = await SiteSettingsModel.findOne({ key: "main" }).select("-logoData").lean();

		return normalizeSettings(doc as Parameters<typeof normalizeSettings>[0]);
	} catch (error) {
		console.error(error);

		return DEFAULT_SITE_SETTINGS;
	}
}

export const SITE_SETTINGS_TAG = "site-settings";

/** The settings of the site (cached, the cache is cleared when an admin saves the settings). */
export const getSiteSettings = unstable_cache(loadSiteSettings, [SITE_SETTINGS_TAG], {
	tags: [SITE_SETTINGS_TAG],
	revalidate: 600,
});
