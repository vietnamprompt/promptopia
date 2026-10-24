import { Schema, model, models } from "mongoose";

/**
 * A mark that a viewer copied a post. It is used to count a copy only once per viewer,
 * per post, per 24 hours.
 *
 * "viewer" is "u:<user id>" for a logged in user or "a:<random id from a cookie>" for a visitor.
 */
const CopyMarkSchema = new Schema({
	post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
	viewer: { type: String, required: true },
	countedAt: { type: Date, required: true },
});

// One mark per viewer and post.
CopyMarkSchema.index({ post: 1, viewer: 1 }, { unique: true });
// The old marks are useless after the 24 hours, the database removes them after 7 days.
CopyMarkSchema.index({ countedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const CopyMark = models.CopyMark || model("CopyMark", CopyMarkSchema);
export default CopyMark;
