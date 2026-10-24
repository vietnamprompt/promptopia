"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import logo from "@/public/icons/svg/mlt.promptopia.logo.favicon.svg";
import { PostTypeFromDb } from "@/interfaces/Post";
import { postPath } from "@/lib/post-url";
import type { RelatedPost } from "@/lib/related-posts";

import PostCard from "./PostCard";

interface Props {
	post: PostTypeFromDb;
	related: RelatedPost[];
}

/** The content of the page of one prompt ("/p/..."): the whole post, the share buttons and the related prompts. */
const PromptDetail: React.FC<Props> = ({ post, related }) => {
	const t = useTranslations("PromptPage");
	const locale = useLocale();
	const router = useRouter();
	const [copied, setCopied] = useState("");
	const [linkCopied, setLinkCopied] = useState(false);
	const [canShare, setCanShare] = useState(false);
	const [pageUrl, setPageUrl] = useState("");

	// The address of this page, it is known only in the browser.
	useEffect(() => {
		setPageUrl(window.location.href.split("#")[0]);
		setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
	}, []);

	const encodedUrl = encodeURIComponent(pageUrl);
	const encodedTitle = encodeURIComponent(post.title);

	const socials = [
		{ name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
		{ name: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
		{ name: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
		{ name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
	];

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(pageUrl);
			setLinkCopied(true);
			setTimeout(() => setLinkCopied(false), 2500);
		} catch (error) {
			console.error(error);
		}
	};

	const nativeShare = async () => {
		try {
			await navigator.share({ title: post.title, url: pageUrl });
		} catch (error) {
			// The visitor closed the window of sharing, it is not an error.
		}
	};

	const buttonClass =
		"rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-mlt-dark-4 transition hover:border-mlt-orange-secondary hover:text-mlt-orange-secondary";

	return (
		<section className="mx-auto flex w-full max-w-2xl flex-col items-stretch">
			<Link
				className="self-start text-sm font-medium text-mlt-orange-secondary hover:underline"
				href={`/${locale}`}
			>
				← {t("back")}
			</Link>

			<div className="mt-6 w-full">
				<PostCard
					detail
					copied={copied}
					handleTagClick={(tag) => router.push(`/${locale}?tag=${encodeURIComponent(tag)}`)}
					post={post}
					setCopied={setCopied}
				/>
			</div>

			<div className="w-full rounded-xl border-2 border-mlt-gray-5/80 bg-white/30 p-5">
				<h2 className="form_input_title">{t("share")}</h2>

				<div className="mt-3 flex flex-wrap gap-2">
					{pageUrl &&
						socials.map((item) => (
							<a
								key={item.name}
								className={buttonClass}
								href={item.href}
								rel="noopener noreferrer"
								target="_blank"
							>
								{item.name}
							</a>
						))}

					{canShare && (
						<button className={buttonClass} type="button" onClick={nativeShare}>
							{t("shareOther")}
						</button>
					)}

					<button className={buttonClass} type="button" onClick={copyLink}>
						{linkCopied ? t("linkCopied") : t("copyLink")}
					</button>
				</div>
			</div>

			{related.length > 0 && (
				<div className="mt-12 w-full">
					<h2 className="font-satoshi text-xl font-bold text-mlt-dark-2">{t("related")}</h2>
					<p className="mt-1 text-sm text-mlt-dark-6">{t("relatedHint")}</p>

					<ul className="mt-5 grid gap-4 sm:grid-cols-2">
						{related.map((item) => (
							<li key={item._id} className="flex">
								<Link
									className="group flex w-full flex-col rounded-xl border-2 border-mlt-gray-5/80 bg-white/40 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-mlt-orange-secondary hover:shadow-md"
									href={`/${locale}${postPath(item)}`}
								>
									<h3 className="font-satoshi line-clamp-2 text-base font-semibold leading-snug text-mlt-dark-2 group-hover:text-mlt-orange-secondary">
										{item.title}
									</h3>

									{item.snippet && (
										<p className="mt-2 line-clamp-2 text-sm text-mlt-dark-6">{item.snippet}</p>
									)}

									<div className="mt-3 flex flex-wrap gap-1.5">
										{item.tags.slice(0, 4).map((tag) => (
											<span
												key={tag}
												className={`rounded-full px-2 py-0.5 text-xs ${
													item.sharedTags.includes(tag)
														? "bg-mlt-orange-secondary/15 font-medium text-mlt-orange-secondary"
														: "bg-white text-mlt-dark-6"
												}`}
											>
												#{tag}
											</span>
										))}
									</div>

									<div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-mlt-dark-6">
										<span className="flex min-w-0 items-center gap-2">
											<Image
												unoptimized
												alt=""
												className="h-6 w-6 shrink-0 rounded-full bg-white object-cover"
												height={24}
												src={item.creator?.image || logo}
												width={24}
											/>
											<span className="truncate">@{item.creator?.username ?? "user"}</span>
										</span>

										<span className="shrink-0">{t("copies", { count: item.copyCount })}</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
};

export default PromptDetail;
