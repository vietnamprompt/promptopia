/**
 * https://tailwindcss-glassmorphism.vercel.app/
 */
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import Link from "next/link";

import { FormProps, FormTypes } from "@/interfaces/Form";
import { MorePrompt, POST_LIMITS, PostTypeFromDb } from "@/interfaces/Post";
import { SharePlatform, SHARE_PLATFORMS } from "@/interfaces/SharePlatform";

import { Path } from "@/interfaces/Path";

import Header from "./Header";

const Form: React.FC<FormProps> = ({
	handleSubmit,
	post,
	setPost,
	submitting,
	type,
	errors,
}) => {
	const t = useTranslations("Form");
	const i18nFormType = { type: t(`Types.${type}`) };

	const haveError = (errorKey: keyof PostTypeFromDb) =>
		!!(errors && errors?.[errorKey] && errors?.[errorKey]?.message);

	const displayAnError = (errorKey: keyof PostTypeFromDb) =>
		haveError(errorKey) && <p className="form_error">{errors?.[errorKey]?.message}</p>;

	// The old posts do not have these fields.
	const title = post.title ?? "";
	const description = post.description ?? "";
	const selectedPlatforms: SharePlatform[] = post.sharePlatforms ?? [];
	const morePrompts = post.morePrompts ?? [];

	// The additional prompts keep the order of typing (the new one is added at the end).
	const addMorePrompt = () => {
		if (morePrompts.length < POST_LIMITS.morePromptsMax) {
			setPost({ ...post, morePrompts: [...morePrompts, { title: "", prompt: "" }] });
		}
	};

	const changeMorePrompt = (index: number, patch: Partial<MorePrompt>) => {
		setPost({
			...post,
			morePrompts: morePrompts.map((item, i) => (i === index ? { ...item, ...patch } : item)),
		});
	};

	const removeMorePrompt = (index: number) => {
		setPost({ ...post, morePrompts: morePrompts.filter((_, i) => i !== index) });
	};

	const toggleSharePlatform = (platform: SharePlatform) => {
		setPost({
			...post,
			sharePlatforms: selectedPlatforms.includes(platform)
				? selectedPlatforms.filter((item) => item !== platform)
				: [...selectedPlatforms, platform],
		});
	};

	// The tags that already exist, they are suggested while the user types.
	const [existingTags, setExistingTags] = useState<{ tag: string; count: number }[]>([]);

	useEffect(() => {
		(async () => {
			try {
				const response = await fetch("/api/tags");

				if (response.ok) {
					setExistingTags((await response.json()).tags ?? []);
				}
			} catch (error) {
				console.error(error);
			}
		})();
	}, []);

	const tagParts = String(post.tags ?? "").split(",");
	const typedTags = tagParts
		.slice(0, -1)
		.map((tag) => tag.trim().toLowerCase())
		.filter(Boolean);
	// The tag that is being typed now (after the last comma).
	const tagFragment = (tagParts[tagParts.length - 1] ?? "").trim().toLowerCase().replace(/^#/, "");
	const tagSuggestions = existingTags
		.filter(
			({ tag }) =>
				!typedTags.includes(tag.toLowerCase()) &&
				(tagFragment === "" || tag.toLowerCase().includes(tagFragment))
		)
		.slice(0, 8);

	const addSuggestedTag = (tag: string) => {
		const kept = tagParts
			.slice(0, -1)
			.map((item) => item.trim())
			.filter(Boolean);

		setPost({ ...post, tags: `${[...kept, tag].join(", ")}, ` });
	};

	return (
		<section className="page_section_left w-full">
			<Header
				desc={t("postTypeDesc", i18nFormType)}
				gradient="blue_gradient"
				textStyle="text-left"
				titleGradient={t("postType", i18nFormType)}
			/>

			<form
				className="mt-10 w-full max-w-2xl flex flex-col gap-7 glassmorphism"
				onSubmit={handleSubmit}
			>
				<label htmlFor="prompt-title">
					<span className="form_input_title">{t("title")}</span>

					<input
						required
						className="form_input"
						id="prompt-title"
						maxLength={POST_LIMITS.titleMax}
						minLength={POST_LIMITS.titleMin}
						placeholder={t("titlePlaceholder")}
						value={title}
						onChange={(e) => setPost({ ...post, title: e.target.value })}
					/>
					<span className="text-xs text-mlt-dark-6">
						{title.length} / {POST_LIMITS.titleMax}
					</span>
					<span className="mt-1 block text-xs text-mlt-dark-6">{t("titleCaseHint")}</span>
					{displayAnError("title")}
				</label>

				<label htmlFor="prompt-description">
					<span className="form_input_title">{t("description")}</span>

					<textarea
						className="form_input h-[100px] min-h-[50px]"
						id="prompt-description"
						maxLength={POST_LIMITS.descriptionMax}
						placeholder={t("descriptionPlaceholder")}
						value={description}
						onChange={(e) => setPost({ ...post, description: e.target.value })}
					/>
					<span className="text-xs text-mlt-dark-6">
						{description.length} / {POST_LIMITS.descriptionMax}
					</span>
					{displayAnError("description")}
				</label>

				<label htmlFor="prompt-content">
					<span className="form_input_title">{t("yourPrompt")}</span>

					<textarea
						required
						className="form_input form_textarea"
						id="prompt-content"
						maxLength={POST_LIMITS.promptMax}
						placeholder={t("yourPromptPlaceholder")}
						value={post.prompt}
						onChange={(e) => setPost({ ...post, prompt: e.target.value })}
					/>
					<span className="text-xs text-mlt-dark-6">
						{post.prompt.length} / {POST_LIMITS.promptMax}
					</span>
					{displayAnError("prompt")}
				</label>

				{morePrompts.map((item, index) => (
					<div
						// The prompts keep the order of typing, the index is the identity.
						// eslint-disable-next-line react/no-array-index-key
						key={index}
						className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white/60 p-4"
					>
						<div className="flex items-center justify-between gap-3">
							<span className="form_input_title">{t("morePromptNumber", { n: index + 2 })}</span>

							<button
								className="text-sm text-red-600 hover:underline"
								type="button"
								onClick={() => removeMorePrompt(index)}
							>
								{t("removePrompt")}
							</button>
						</div>

						<input
							required
							aria-label={t("morePromptTitle")}
							className="form_input !mt-0"
							maxLength={POST_LIMITS.morePromptTitleMax}
							placeholder={t("morePromptTitlePlaceholder")}
							value={item.title}
							onChange={(e) => changeMorePrompt(index, { title: e.target.value })}
						/>

						<textarea
							required
							aria-label={t("yourPrompt")}
							className="form_input form_textarea !mt-0"
							maxLength={POST_LIMITS.promptMax}
							placeholder={t("yourPromptPlaceholder")}
							value={item.prompt}
							onChange={(e) => changeMorePrompt(index, { prompt: e.target.value })}
						/>
						<span className="text-xs text-mlt-dark-6">
							{item.prompt.length} / {POST_LIMITS.promptMax}
						</span>
					</div>
				))}

				<div className="-mt-3 flex flex-col items-start gap-1">
					{morePrompts.length < POST_LIMITS.morePromptsMax && (
						<button className="_btn gray_light" type="button" onClick={addMorePrompt}>
							{t("addPrompt")}
						</button>
					)}
					{displayAnError("morePrompts")}
				</div>

				<label htmlFor="prompt-tag">
					<span className="form_input_title">{t("tags")}</span>

					<input
						required
						className="form_input"
						id="prompt-tag"
						placeholder={t("tagPlaceholder")}
						value={String(post.tags)}
						onChange={(e) => setPost({ ...post, tags: e.target.value })}
					/>
					{displayAnError("tags")}
				</label>

				{tagSuggestions.length > 0 && (
					<div className="-mt-3 flex flex-wrap items-center gap-2">
						<span className="text-xs text-mlt-dark-6">
							{tagFragment ? t("tagSuggestions") : t("tagPopular")}
						</span>

						{tagSuggestions.map(({ tag, count }) => (
							<button
								key={tag}
								className="post_button bg-white text-sm text-mlt-dark-4"
								type="button"
								onClick={() => addSuggestedTag(tag)}
							>
								{tag} <span className="text-xs text-mlt-dark-6">({count})</span>
							</button>
						))}
					</div>
				)}

				<div>
					<span className="form_input_title">{t("sharePlatforms")}</span>
					<p className="mt-1 text-sm text-mlt-dark-6">{t("sharePlatformsDesc")}</p>

					<div className="mt-3 flex flex-wrap gap-2">
						{Object.values(SharePlatform).map((platform) => {
							const isSelected = selectedPlatforms.includes(platform);

							return (
								<button
									key={platform}
									aria-pressed={isSelected}
									className={`post_button !px-3 !py-1 text-sm ${
										isSelected
											? "bg-mlt-orange-secondary text-white"
											: "bg-white text-mlt-dark-4"
									}`}
									type="button"
									onClick={() => toggleSharePlatform(platform)}
								>
									{SHARE_PLATFORMS[platform].name}
								</button>
							);
						})}
					</div>
				</div>

				<div className="flex justify-end items-center gap-4 flex-row w-full">
					<Link
						className="text-sm text-mlt-dark-4 hover:text-mlt-orange-primary"
						href={type === FormTypes.EDIT ? Path.PROFILE : Path.HOME}
					>
						{t("cancel")}
					</Link>
					<button className="_btn orange_invert" disabled={submitting} type="submit">
						{submitting ? t("processing", i18nFormType) : t("submit", i18nFormType)}
					</button>
				</div>
			</form>
		</section>
	);
};

export default Form;
