/**
 * The settings of the site.
 *
 * GET /api/site-settings   (public)  =>  the settings (all of them are public: the name, the SEO texts...)
 * PUT /api/site-settings   (admins)  body: { siteName, footerText, googleVerification, announcementEnabled,
 *                                           announcementText, seo: { en, vi }, logo?: dataUrl | null }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";

import { normalizeSettings, SEO_LOCALES, SETTINGS_LIMITS } from "@/interfaces/SiteSettings";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth-options";
import { detectImageType } from "@/lib/image-type";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { SITE_SETTINGS_TAG } from "@/lib/site-settings";
import SiteSettingsModel from "@/models/site-settings";

export const dynamic = "force-dynamic";

const text = (value: unknown, max: number) =>
	typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

export async function GET() {
	try {
		await connectToMongoDb();

		const doc = await SiteSettingsModel.findOne({ key: "main" }).select("-logoData").lean();

		return NextResponse.json(normalizeSettings(doc as Parameters<typeof normalizeSettings>[0]), {
			status: 200,
		});
	} catch (error) {
		return NextResponse.json({ error: "Failed to retrieve the settings!" }, { status: 500 });
	}
}

export async function PUT(request: NextRequest) {
	const session = await getServerSession(authOptions);

	if (!session) {
		return NextResponse.json({ error: "Unauthorized!" }, { status: 401 });
	}

	if (!isAdminEmail(session.user?.email)) {
		return NextResponse.json({ error: "Forbidden!" }, { status: 403 });
	}

	try {
		const body = await request.json().catch(() => null);

		if (!body || typeof body !== "object") {
			return NextResponse.json({ error: "Invalid request!" }, { status: 400 });
		}

		const siteName = text(body.siteName, SETTINGS_LIMITS.siteName);

		if (!siteName) {
			return NextResponse.json({ error: "siteNameRequired" }, { status: 400 });
		}

		const $set: Record<string, unknown> = {
			siteName,
			footerText: text(body.footerText, SETTINGS_LIMITS.footerText),
			googleVerification: text(body.googleVerification, SETTINGS_LIMITS.googleVerification),
			announcementEnabled: body.announcementEnabled === true,
			announcementText: text(body.announcementText, SETTINGS_LIMITS.announcement),
		};

		SEO_LOCALES.forEach((locale) => {
			const seo = (body.seo?.[locale] ?? {}) as Record<string, unknown>;

			$set[`seo.${locale}`] = {
				title: text(seo.title, SETTINGS_LIMITS.title),
				description: text(seo.description, SETTINGS_LIMITS.description),
				keywords: text(seo.keywords, SETTINGS_LIMITS.keywords),
			};
		});

		const $unset: Record<string, 1> = {};

		if ("logo" in body) {
			if (body.logo === null) {
				$unset.logoData = 1;
				$unset.logoType = 1;
				$unset.logoVersion = 1;
			} else {
				const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
					String(body.logo)
				);
				const bytes = match ? Buffer.from(match[1], "base64") : null;
				const type = bytes ? detectImageType(bytes) : null;

				if (!bytes || !type || type === "image/gif" || bytes.length > SETTINGS_LIMITS.logoBytes) {
					return NextResponse.json({ error: "logoInvalid" }, { status: 400 });
				}

				$set.logoData = match?.[1];
				$set.logoType = type;
				$set.logoVersion = Date.now();
			}
		}

		await connectToMongoDb();

		const doc = await SiteSettingsModel.findOneAndUpdate(
			{ key: "main" },
			{ $set, ...(Object.keys($unset).length ? { $unset } : {}) },
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		)
			.select("-logoData")
			.lean();

		revalidateTag(SITE_SETTINGS_TAG);

		return NextResponse.json(normalizeSettings(doc as Parameters<typeof normalizeSettings>[0]), {
			status: 200,
		});
	} catch (error) {
		return NextResponse.json({ error: "Failed to save the settings!" }, { status: 500 });
	}
}
