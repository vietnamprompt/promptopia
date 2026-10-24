/**
 * https://yoursite/robots.txt - tells Google which pages to read. The private pages are excluded.
 */
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	const base = String(process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");

	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: [
				"/api/",
				"/*/admin",
				"/*/user-profile",
				"/*/my-posts",
				"/*/post-create",
				"/*/post-update",
				"/*/post-delete",
			],
		},
		sitemap: `${base}/sitemap.xml`,
	};
}
