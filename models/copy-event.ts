import { Schema, model, models } from "mongoose";

/**
 * One document for every counted copy of a post. It is used only for the "Trending" tab
 * (the most copied posts of the last 7 days), so the database removes the old ones.
 * The total of the copies is "copyCount" in the post.
 */
const CopyEventSchema = new Schema({
	post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
	at: { type: Date, default: Date.now },
});

CopyEventSchema.index({ post: 1, at: -1 });
CopyEventSchema.index({ at: 1 }, { expireAfterSeconds: 8 * 24 * 60 * 60 });

const CopyEvent = models.CopyEvent || model("CopyEvent", CopyEventSchema);
export default CopyEvent;
