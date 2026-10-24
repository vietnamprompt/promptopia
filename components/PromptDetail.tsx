"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { PostTypeFromDb } from "@/interfaces/Post";
import { postPath } from "@/lib/post-url";

import PostCard from "./PostCard";

interface Props {
	post: PostTypeFromDb;
	related: { _id: string; title: string }[];
}

/** The content of the page of one prompt ("/p/..."): the whole post and the related prompts. */
const PromptDetail: React.FC<Props> = ({ post, related }) => {
	const t = useTranslations("PromptPage");
	const locale = useLocale();
	const router = useRouter();
	const [copied, setCopied] = useState("");

	return (
		<section className="page_section_left w-full">
			<Link
				className="text-sm font-medium text-mlt-orange-secondary hover:underline"
				href={`/${locale}`}
			>
				← {t("back")}
			</Link>

			<div className="mt-6 w-full max-w-2xl">
				<PostCard
					detail
					copied={copied}
					handleTagClick={(tag) => router.push(`/${locale}?tag=${encodeURIComponent(tag)}`)}
					post={post}
					setCopied={setCopied}
				/>
			</div>

			{related.length > 0 && (
				<div className="mt-10 w-full max-w-2xl">
					<h2 className="form_input_title">{t("related")}</h2>

					<ul className="mt-3 flex flex-col gap-2">
						{related.map((item) => (
							<li key={item._id}>
								<Link
									className="text-mlt-dark-4 hover:text-mlt-orange-secondary hover:underline"
									href={`/${locale}${postPath(item)}`}
								>
									{item.title}
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
