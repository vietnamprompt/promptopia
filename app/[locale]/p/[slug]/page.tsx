/**
 * The page of one prompt: /{locale}/p/{slug}-{token}   (see 'lib/post-url.ts').
 * It is built on the server, so Google reads the whole text. Only the approved posts have a page.
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import mongoose from "mongoose";

import PromptDetail from "@/components/PromptDetail";
import { PostStatus } from "@/interfaces/Post";
import { addSavedCounts } from "@/lib/engagement";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import { parsePostParam, postPath, postSlug } from "@/lib/post-url";
import { POST_POPULATE, toPublicPost } from "@/lib/public-user";
import { getSiteSettings } from "@/lib/site-settings";
import Post from "@/models/post";

export const dynamic = "force-dynamic";

interface PageProps {
	params: { locale: string; slug: string };
}

type PlainPost = {
	_id: string;
	title: string;
	description?: string;
	prompt: string;
	tags: string[];
	createdAt?: string;
	updatedAt?: string;
	creator?: { name?: string; username?: string } | null;
	[key: string]: unknown;
};

// The page and its metadata read the same post, the database is asked once.
const loadPost = cache(async (param: string) => {
	const parsed = parsePostParam(param);

	if (!parsed || !mongoose.isValidObjectId(parsed.id)) {
		return null;
	}

	await connectToMongoDb();

	const doc = await Post.findOne({ _id: parsed.id, status: PostStatus.APPROVED }).populate(
		POST_POPULATE
	);

	if (!doc) {
		return null;
	}

	const [withCount] = await addSavedCounts([toPublicPost(doc)]);

	// Plain data (no ObjectId or Date objects), so it can go to the browser.
	const post = JSON.parse(JSON.stringify(withCount)) as PlainPost;

	return { post, slug: parsed.slug };
});

const shorten = (text: string, max: number) =>
	text.replace(/\s+/g, " ").trim().slice(0, max).trim();

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const loaded = await loadPost(params.slug);

	if (!loaded) {
		return { title: "404", robots: { index: false } };
	}

	const { post } = loaded;
	const settings = await getSiteSettings();
	const path = postPath(post);
	const description = shorten(post.description || post.prompt, 160);

	return {
		title: `${post.title} | ${settings.siteName}`,
		description,
		keywords: post.tags,
		// The same prompt has the address in both languages, Google should keep one of them.
		alternates: {
			canonical: `/vi${path}`,
			languages: { vi: `/vi${path}`, en: `/en${path}` },
		},
		openGraph: {
			title: post.title,
			description,
			type: "article",
			siteName: settings.siteName,
			images: settings.logoUrl ? [settings.logoUrl] : undefined,
		},
	};
}

export default async function PromptPage({ params }: PageProps) {
	const loaded = await loadPost(params.slug);

	if (!loaded) {
		notFound();
	}

	const { post, slug } = loaded;

	// An old or a wrong slug (i.e. after the title was changed) is sent to the current address.
	if (slug !== null && slug !== postSlug(post.title)) {
		redirect(`/${params.locale}${postPath(post)}`);
	}

	// The prompts with the same tags, the visitor can continue to read.
	const related = (await Post.find({
		_id: { $ne: post._id },
		status: PostStatus.APPROVED,
		tags: { $in: post.tags },
	})
		.sort({ _id: -1 })
		.limit(4)
		.select("title")
		.lean()) as unknown as { _id: unknown; title: string }[];

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: post.title,
		description: shorten(post.description || post.prompt, 200),
		keywords: post.tags.join(", "),
		datePublished: post.createdAt,
		dateModified: post.updatedAt,
		inLanguage: params.locale,
		...(post.creator?.name ? { author: { "@type": "Person", name: post.creator.name } } : {}),
	};

	return (
		<>
			<script
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
				type="application/ld+json"
			/>
			<PromptDetail
				post={post as never}
				related={related.map((item) => ({ _id: String(item._id), title: item.title }))}
			/>
		</>
	);
}
