import { Schema, model, models } from "mongoose";

const SeoSchema = {
	title: { type: String },
	description: { type: String },
	keywords: { type: String },
};

// One document (key: "main") with the settings of the site.
const SiteSettingsSchema = new Schema({
	key: { type: String, default: "main", unique: true },
	siteName: { type: String },
	footerText: { type: String },
	googleVerification: { type: String },
	announcementEnabled: { type: Boolean, default: false },
	announcementText: { type: String },
	autoApproveAfter: { type: Number, default: 0 },
	bannedWords: { type: String },
	seo: {
		en: SeoSchema,
		vi: SeoSchema,
	},
	// The logo is small (the browser resizes it), it is kept here and served by '/api/site-settings/logo'.
	logoData: { type: String },
	logoType: { type: String },
	logoVersion: { type: Number },
});

const SiteSettingsModel = models.SiteSettings || model("SiteSettings", SiteSettingsSchema);

export default SiteSettingsModel;
