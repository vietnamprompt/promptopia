// Ref.: https://youtu.be/wm5gMKuwSYk?t=5477
// Ref. regexp: https://gist.githubusercontent.com/adrianhajdin/6df61c6cd5ed052dce814a765bff9032/raw/3964dff2483e7aded3c567df1fb0b3f90a74b0aa/user.js
import { Schema, model, models } from "mongoose";

import { SOCIAL_LINK_MAX } from "@/interfaces/SocialLinks";

const UserSchema = new Schema({
	email: {
		type: String,
		required: [true, "Email is required!"],
		unique: [true, "Email already exists!"],
	},
	username: {
		type: String,
		required: [true, "Username is required!"],
		match: [
			/^(?=.{4,84}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/,
			"Username is invalid, it should contain 4-84 alphanumeric letters and be unique!",
		],
	},
	// The user can choose the username only once, until then it is generated automatically.
	usernameChosen: {
		type: Boolean,
		default: false,
	},
	// The e-mail is visible on the public profile only if the user chooses it.
	showEmail: {
		type: Boolean,
		default: false,
	},
	// The saved posts are private, unless the user makes them public.
	savedPublic: {
		type: Boolean,
		default: false,
	},
	name: {
		type: String,
	},
	image: {
		type: String,
	},
	accountProvider: {
		type: String,
		required: [true, "Account provider is required!"],
	},
	description: {
		type: String,
	},
	// The links to the website and to the social networks (see '@/interfaces/SocialLinks.ts').
	socialLinks: {
		website: { type: String, maxlength: SOCIAL_LINK_MAX },
		email: { type: String, maxlength: SOCIAL_LINK_MAX },
		facebook: { type: String, maxlength: SOCIAL_LINK_MAX },
		x: { type: String, maxlength: SOCIAL_LINK_MAX },
		zalo: { type: String, maxlength: SOCIAL_LINK_MAX },
		instagram: { type: String, maxlength: SOCIAL_LINK_MAX },
		tiktok: { type: String, maxlength: SOCIAL_LINK_MAX },
		youtube: { type: String, maxlength: SOCIAL_LINK_MAX },
		threads: { type: String, maxlength: SOCIAL_LINK_MAX },
		telegram: { type: String, maxlength: SOCIAL_LINK_MAX },
		github: { type: String, maxlength: SOCIAL_LINK_MAX },
	},
});

// Two users can not have the same username.
UserSchema.index({ username: 1 }, { unique: true });

/**
 * For a regular  always on always 
 * running backend server (as express.js),
 * we would do something like this:
 * 
const User = model("User", UserSchema);
export default User;
*/

/**
 * For the Next.js API Routes, and serverless functions
 * we need something like below. Note "models" object,
 * provided by the mongoose library stores
 * all the registered models.
 */
const User = models.User || model("User", UserSchema);
export default User;
