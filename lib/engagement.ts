import Save from "@/models/save";

/**
 * Adds "savedCount" to the posts (plain objects, see "toPublicPost()").
 * One query for all posts of the list.
 */
export async function addSavedCounts<T extends object>(
	posts: T[]
): Promise<(T & { savedCount: number })[]> {
	const idOf = (post: object) => (post as { _id?: unknown })._id;
	const ids = posts.map(idOf).filter(Boolean);

	if (ids.length === 0) {
		return posts.map((post) => ({ ...post, savedCount: 0 }));
	}

	const rows: { _id: unknown; count: number }[] = await Save.aggregate([
		{ $match: { post: { $in: ids } } },
		{ $group: { _id: "$post", count: { $sum: 1 } } },
	]);

	const counts = new Map(rows.map((row) => [String(row._id), row.count]));

	return posts.map((post) => ({ ...post, savedCount: counts.get(String(idOf(post))) ?? 0 }));
}
