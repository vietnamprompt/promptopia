import { Schema, model, models } from "mongoose";

/**
 * "user" saved "post". One document per pair (see the unique index).
 * The saved count of a post is the number of these documents (it is also used for the
 * "most saved" tabs of the homepage in the next phase).
 */
const SaveSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: "User", required: true },
	post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
	createdAt: { type: Date, default: Date.now },
});

// A user can save a post only once.
SaveSchema.index({ user: 1, post: 1 }, { unique: true });
// The saved list of a user (newest first) and the counts per post / per period.
SaveSchema.index({ user: 1, createdAt: -1 });
SaveSchema.index({ post: 1, createdAt: -1 });

const Save = models.Save || model("Save", SaveSchema);
export default Save;
