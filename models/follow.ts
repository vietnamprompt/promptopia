import { Schema, model, models } from "mongoose";

/**
 * "follower" follows "following". One document per pair (see the unique index).
 */
const FollowSchema = new Schema({
	follower: { type: Schema.Types.ObjectId, ref: "User", required: true },
	following: { type: Schema.Types.ObjectId, ref: "User", required: true },
	createdAt: { type: Date, default: Date.now },
});

// A user can follow another user only once.
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
// The list of the followers of a user (newest first).
FollowSchema.index({ following: 1, createdAt: -1 });

const Follow = models.Follow || model("Follow", FollowSchema);
export default Follow;
