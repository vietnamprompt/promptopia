import { NextResponse, NextRequest } from "next/server";

import { ObjectId, GridFSFile } from "mongodb";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { isAdminEmail } from "@/lib/admin";
import { detectImageType, POST_IMAGE_MAX_BYTES } from "@/lib/image-type";
import { connectToMongoDb, gridFSBucket } from "@/lib/mongodb-mongoose";
import { GridFS } from "@/models/grid_fs";
import Post from "@/models/post";

import { Readable } from "stream";

interface Context {
	params: { query: string[] };
}

function paramsToObject(params: Context["params"]) {
	return Object.keys(params).length > 0 ? { filename: params?.query[0] } : {};
}

/**
 * 1) If the query has 2 parameters,
 *    the first must be the string "id" and the second must be the {id} itself.
 * 2) If the query has 1 parameter, it must be the {filename}.
 *    > If the filename is not found in the database then return the file list
 *      or 404 in case the bucket is empty.
 *    > It is possible to have multiple files with the same name.
 *      In this case, also, an array of files will be returned.
 * 3) If the query has no parameters, return the file list.
 */
export async function GET(request: NextRequest, { params }: Context) {
	try {
		// connect to the database and get the bucket
		const bucket = await gridFSBucket();

		if (params?.query.length > 1) {
			if (params?.query[0] === "id") {
				const _id = new ObjectId(params?.query[1]);

				const file = (await GridFS.find({ _id }))[0] as GridFSFile;
				const stream = bucket.openDownloadStream(_id) as unknown as ReadableStream;

				return new NextResponse(stream, {
					headers: {
						"Content-Type": file?.contentType || "image",
					},
					status: 200,
				});
			} else {
				throw new Error(
					"Invalid query. When 1 parameter is provided, it must be filename. When two are provided, the first must be string 'id' and the second must be the id."
				);
			}
		} else {
			const files = await bucket.find(paramsToObject(params)).toArray();

			switch (files?.length) {
				case 0: {
					return new NextResponse(null, { status: 404, statusText: "Not found" });
				}

				case 1: {
					const file = files.at(0)!;
					const stream = bucket.openDownloadStreamByName(
						file.filename
					) as unknown as ReadableStream;

					return new NextResponse(stream, {
						headers: {
							"Content-Type": file?.contentType || "image",
						},
						status: 200,
					});
				}

				default:
					return NextResponse.json(files, { status: 200 });
			}
		}
	} catch (error) {
		return NextResponse.json(error, { status: 500 });
	}
}

/**
 * Post a file to the database.
 * An example of how to post a file using fetch:
 *
const formData = new FormData();
formData.append('file', file); // 'file' is the key name for the uploaded file

fetch('/api/files/', { method: 'POST', body: formData })
 	.then(response => response.json())
 	.then(data => { console.log(data); })
 	.catch(error => { console.error(error); });
 */
export async function POST(request: NextRequest) {
	const session = await getServerSession(authOptions);
	const userId = session?.user?.id;

	if (!session || !userId) {
		return NextResponse.json({ error: "Unauthorized!" }, { status: 401 });
	}

	try {
		// connect to the database and get the bucket
		const bucket = await gridFSBucket();
		// get the form data
		const data = await request.formData();

		const response = [];

		// map through all the entries
		for (const entry of Array.from(data.entries())) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const [key, value] = entry;

			// FormDataEntryValue can either be type `Blob` or `string`
			// if its type is object then it's a Blob
			const isFile = typeof value === "object";

			if (isFile) {
				const blob = value as Blob;
				const filename = blob.name;

				if (blob.size > POST_IMAGE_MAX_BYTES) {
					return NextResponse.json({ error: "The image is too big!" }, { status: 413 });
				}

				const buffer = Buffer.from(await blob.arrayBuffer());

				// Only images (JPG, PNG, WebP, GIF), detected by the content of the file.
				const contentType = detectImageType(buffer);

				if (!contentType) {
					return NextResponse.json({ error: "Only images are allowed!" }, { status: 415 });
				}

				const uploadStream = bucket.openUploadStream(filename, {
					contentType,
					// The owner is checked when the file is deleted.
					metadata: { owner: userId, kind: "post" },
				});

				await new Promise<void>((resolve, reject) => {
					uploadStream.on("finish", () => resolve());
					uploadStream.on("error", reject);
					uploadStream.end(buffer);
				});

				response.push({ filename, _id: uploadStream.id.toString() });
			}
		}

		// return the response after all the entries have been processed.
		return NextResponse.json(response, { status: 201 });
	} catch (error) {
		return NextResponse.json(error, { status: 500 });
	}
}

/**
 * Delete a file from the database.
 * An example of how to delete a file using fetch:
 *
fetch('/api/files/123', { method: 'DELETE' })
  .then(response => {
    if (response.ok) console.log('File deleted successfully');
    else if (response.status === 404) console.log('File not found');
    else console.error('Error deleting file');
  })
  .catch(error => { console.error(error); });
 */
export async function DELETE(request: NextRequest, { params }: Context) {
	const session = await getServerSession(authOptions);
	const userId = session?.user?.id;

	if (!session || !userId) {
		return NextResponse.json({ error: "Unauthorized!" }, { status: 401 });
	}

	try {
		const bucket = await gridFSBucket();

		if (params?.query.length === 1) {
			if (!ObjectId.isValid(params?.query[0])) {
				return new NextResponse(null, { status: 404, statusText: "Not found" });
			}

			const fileId = new ObjectId(params?.query[0]);

			const file = await bucket.find({ _id: fileId }).toArray();

			if (file.length === 0) {
				return new NextResponse(null, { status: 404, statusText: "Not found" });
			}

			// Only the owner of the file (and the admins) can delete it.
			// The old files (uploaded before the owner was saved) belong to the creator
			// of the post that uses them.
			const owner = file[0]?.metadata?.owner;
			let allowed = isAdminEmail(session.user?.email);

			if (!allowed && owner) {
				allowed = String(owner) === userId;
			}

			if (!allowed && !owner) {
				await connectToMongoDb();
				allowed = !!(await Post.exists({ creator: userId, image: fileId }));
			}

			if (!allowed) {
				return NextResponse.json({ error: "Forbidden!" }, { status: 403 });
			}

			await bucket.delete(fileId);

			return new NextResponse(null, { status: 204 });
		} else {
			throw new Error("Invalid query. When 1 parameter is provided, it must be the file ID.");
		}
	} catch (error) {
		return NextResponse.json(error, { status: 500 });
	}
}
