import { GridFSFile } from "mongodb";

import { UserTypeFromDb } from "@/interfaces/User";
import { SharePlatform } from "@/interfaces/SharePlatform";

// The limits are checked on the server (models/post.ts), the form only shows them.
export const POST_LIMITS = {
	titleMin: 5,
	titleMax: 80,
	descriptionMax: 300,
	promptMax: 5000,
	tagsMax: 5,
	tagMaxLength: 24,
	// A post can have more prompts after the first one (a chain of prompts), each with a title.
	morePromptsMax: 9,
	morePromptTitleMax: 80,
};

// An additional prompt of a post: a title and the text, without description.
export interface MorePrompt {
	title: string;
	prompt: string;
}

export interface PostType {
	title: string;
	description: string;
	prompt: string;
	tags: string; // tags: string[] | string;
	link: string;
	aiCategory: AiCategories;
	sharePlatforms: SharePlatform[];
	morePrompts?: MorePrompt[]; // the prompts after the first one, in the order of typing
}

export enum PostStatus {
	PENDING = "pending",
	APPROVED = "approved",
	REJECTED = "rejected",
}

// Omit: https://stackoverflow.com/a/51507473/6543935
export interface PostTypeFromDb extends Omit<PostType, "tags"> {
	_id: string;
	tags: string[];
	creator: UserTypeFromDb;
	image: GridFSFile;
	status?: PostStatus; // missing in the old posts, they are handled as "pending"
	updatedAt?: string;
	savedCount?: number; // how many users saved the post
	copyCount?: number; // how many times the prompt was copied (missing in the old posts)
}

export enum AiCategories {
	CHAT = "chat",
	IMAGE = "image",
}

export enum SearchTypes {
	AUTHOR = "author",
	TAGS = "tags",
	PROMPT = "prompt",
}

export const postInit: PostType = {
	title: "",
	description: "",
	prompt: "",
	tags: "",
	aiCategory: AiCategories.CHAT,
	link: "",
	sharePlatforms: [],
	morePrompts: [],
};

export const postFromDbInit: PostTypeFromDb = {
	title: "",
	description: "",
	sharePlatforms: [],
	prompt: "Prompt placeholder...",
	tags: ["tag1", "tag2"],
	aiCategory: AiCategories.CHAT,
	link: "",
	_id: "",
	creator: {} as UserTypeFromDb,
	image: {} as GridFSFile,
};

export type PostErrorsType = {
	// [key: string]: {}
	// "-?" keeps all keys required (the new optional fields must not make the errors optional)
	[key in keyof PostTypeFromDb]-?: {
		kind?: string; // "regexp", "required", etc.
		message?: string; // the actual error message
		name?: string; // ValidatorError
		path?: string; // image, link, etc.
		properties?: {}; // contains the same information as the other fields
		value?: string; // the actual value that caused the error
	};
};
