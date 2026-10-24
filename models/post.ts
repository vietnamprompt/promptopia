/**
 * @see https://youtu.be/wm5gMKuwSYk?t=7575
 */
import { Schema, model, models } from "mongoose";

import { POST_LIMITS, PostStatus } from "@/interfaces/Post";
import { SharePlatform } from "@/interfaces/SharePlatform";

import { GridFS } from "./grid_fs";
import User from "./user";

const PostSchema = new Schema(
	{
		creator: {
			// This is the database ObjectId
			// of the user who created the prompt,
			// it should be the same as the userId.
			type: Schema.Types.ObjectId,
			ref: User,
		},
		// The old posts do not have title and description.
		title: {
			type: String,
			trim: true,
			required: [true, "Title is required!"],
			minlength: [
				POST_LIMITS.titleMin,
				`Title must have at least ${POST_LIMITS.titleMin} characters!`,
			],
			maxlength: [
				POST_LIMITS.titleMax,
				`Title can have up to ${POST_LIMITS.titleMax} characters!`,
			],
		},
		description: {
			type: String,
			trim: true,
			minlength: [
				POST_LIMITS.descriptionMin,
				`Description must have at least ${POST_LIMITS.descriptionMin} characters!`,
			],
			maxlength: [
				POST_LIMITS.descriptionMax,
				`Description can have up to ${POST_LIMITS.descriptionMax} characters!`,
			],
		},
		prompt: {
			type: String,
			required: [true, "Prompt is required!"],
			maxlength: [
				POST_LIMITS.promptMax,
				`Prompt can have up to ${POST_LIMITS.promptMax} characters!`,
			],
		},
		tags: {
			type: Array,
			required: [true, "At least one Tag is required!"],
			validate: {
				validator: (value: unknown) =>
					Array.isArray(value) &&
					value.length >= 1 &&
					value.length <= POST_LIMITS.tagsMax &&
					value.every(
						(tag) => typeof tag === "string" && tag.length <= POST_LIMITS.tagMaxLength
					),
				message: `Use 1-${POST_LIMITS.tagsMax} tags, each up to ${POST_LIMITS.tagMaxLength} characters!`,
			},
		},
		aiCategory: {
			type: String, // actually it is a value of AiCategories
			required: [true, "AI category type is required!"],
		},
		image: {
			type: Schema.Types.ObjectId,
			ref: GridFS,
		},
		// The AI platforms that get an "Open in ..." button on the post.
		sharePlatforms: {
			type: [{ type: String, enum: Object.values(SharePlatform) }],
			default: [],
		},
		status: {
			// New and edited posts are "pending" until an admin approves them.
			// The old posts (created before the moderation was added) do not have
			// this field, they are handled as "pending" too.
			type: String,
			enum: Object.values(PostStatus),
			default: PostStatus.PENDING,
		},
		moderatedAt: {
			type: Date,
		},
	},
	// Adds "createdAt" and "updatedAt", the last one is used to detect
	// if a post was edited while the admin was looking at its old version.
	{ timestamps: true }
);

const Post = models.Post || model("Post", PostSchema);
export default Post;
