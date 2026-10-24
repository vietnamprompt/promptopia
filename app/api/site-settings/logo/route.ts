/**
 * The logo of the site (the image is set by an admin). The address has "?v=version", so the browser
 * can keep the image for a long time: a new logo has a new address.
 */
import { NextResponse } from "next/server";

import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import SiteSettingsModel from "@/models/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		await connectToMongoDb();

		const doc = (await SiteSettingsModel.findOne({ key: "main" })
			.select("logoData logoType")
			.lean()) as unknown as { logoData?: string; logoType?: string } | null;

		if (!doc?.logoData) {
			return new NextResponse(null, { status: 404 });
		}

		return new NextResponse(Buffer.from(doc.logoData, "base64"), {
			status: 200,
			headers: {
				"Content-Type": doc.logoType ?? "image/png",
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		});
	} catch (error) {
		return new NextResponse(null, { status: 500 });
	}
}
