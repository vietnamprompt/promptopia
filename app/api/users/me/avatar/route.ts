/**
 * Upload of the avatar of the logged in user.
 * The browser sends a small (256x256) image, see '@/components/ProfileSettings.tsx'.
 *
 * POST /api/users/me/avatar   body: FormData with the field "file"
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth-options";
import { connectToMongoDb, gridFSBucket } from "@/lib/mongodb-mongoose";
import { AVATAR_MAX_BYTES } from "@/lib/profile-rules";
import User from "@/models/user";

export const dynamic = "force-dynamic";

// The type is detected by the content of the file, the type declared by the browser is not trusted.
function detectImageType(bytes: Uint8Array): string | null {
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return "image/jpeg";
	}

	if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
		return "image/png";
	}

	// WebP: "RIFF" .... "WEBP"
	if (
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return "image/webp";
	}

	return null;
}

function fail(errorKey: string, status: number) {
	return NextResponse.json({ errorKey }, { status });
}

export async function POST(request: NextRequest) {
	const session = await getServerSession(authOptions);
	const userId = session?.user?.id;

	if (!userId || !mongoose.isValidObjectId(userId)) {
		return fail("generic", 401);
	}

	try {
		const data = await request.formData();
		const file = data.get("file");

		if (!(file instanceof Blob)) {
			return fail("avatarType", 400);
		}

		if (file.size > AVATAR_MAX_BYTES) {
			return fail("avatarSize", 400);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const contentType = detectImageType(buffer);

		if (!contentType) {
			return fail("avatarType", 400);
		}

		await connectToMongoDb();

		const user = await User.findById(userId);

		if (!user) {
			return fail("generic", 401);
		}

		const bucket = await gridFSBucket();
		const uploadStream = bucket.openUploadStream(`avatar-${userId}`, {
			contentType,
			metadata: { owner: userId, kind: "avatar" },
		});

		await new Promise<void>((resolve, reject) => {
			uploadStream.on("finish", () => resolve());
			uploadStream.on("error", reject);
			uploadStream.end(buffer);
		});

		const oldImage: string = user.image ?? "";

		user.image = `/api/files/id/${uploadStream.id.toString()}`;
		await user.save();

		// Delete the previous avatar, but only if it is an avatar uploaded by this user.
		const match = /^\/api\/files\/id\/([a-f0-9]{24})$/.exec(oldImage);

		if (match) {
			try {
				const oldId = new ObjectId(match[1]);
				const [oldFile] = await bucket.find({ _id: oldId }).toArray();

				if (oldFile?.metadata?.owner === userId && oldFile?.metadata?.kind === "avatar") {
					await bucket.delete(oldId);
				}
			} catch (error) {
				console.error(error);
			}
		}

		return NextResponse.json({ image: user.image }, { status: 201 });
	} catch (error) {
		console.error(error);

		return fail("generic", 500);
	}
}
