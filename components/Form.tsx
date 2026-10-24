/**
 * https://tailwindcss-glassmorphism.vercel.app/
 */
import React, { useCallback } from "react";
import { useTranslations } from "next-intl";

import Link from "next/link";

import { FormProps, FormTypes } from "@/interfaces/Form";
import { AiCategories, POST_LIMITS, PostTypeFromDb } from "@/interfaces/Post";
import { SharePlatform, SHARE_PLATFORMS } from "@/interfaces/SharePlatform";

import CheckList, { ListItemType } from "@/components/fragments/CheckList";

import { Path } from "@/interfaces/Path";

import IconEmbedSvg from "./fragments/IconEmbedSvg";
import Header from "./Header";

const Form: React.FC<FormProps> = ({
	handleSubmit,
	post,
	setPost,
	submitting,
	type,
	errors,
	handleFileUploadChange,
	postImageFilename,
}) => {
	const t = useTranslations("Form");
	const tCommon = useTranslations("Common");
	const i18nFormType = { type: t(`Types.${type}`) };

	const genAiCategoryList = useCallback(
		(currentAiCat: AiCategories): ListItemType[] =>
			Object.values(AiCategories).map(
				(aiCategory: string): ListItemType => ({
					label: tCommon(`aiCats.${aiCategory}`),
					checked: currentAiCat === aiCategory,
					value: aiCategory,
				})
			),
		[tCommon]
	);

	const handlePostAiCategoryChange = (aiCategoryList: ListItemType[]) => {
		const aiCategory = aiCategoryList.find((category) => category.checked)?.value as AiCategories;

		setPost((prevPost) => ({ ...prevPost, aiCategory }));
	};

	const haveError = (errorKey: keyof PostTypeFromDb) =>
		!!(errors && errors?.[errorKey] && errors?.[errorKey]?.message);

	const displayAnError = (errorKey: keyof PostTypeFromDb) =>
		haveError(errorKey) && <p className="form_error">{errors?.[errorKey]?.message}</p>;

	// The old posts do not have these fields.
	const title = post.title ?? "";
	const description = post.description ?? "";
	const selectedPlatforms: SharePlatform[] = post.sharePlatforms ?? [];

	const toggleSharePlatform = (platform: SharePlatform) => {
		setPost({
			...post,
			sharePlatforms: selectedPlatforms.includes(platform)
				? selectedPlatforms.filter((item) => item !== platform)
				: [...selectedPlatforms, platform],
		});
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
					{displayAnError("title")}
				</label>

				<label htmlFor="prompt-description">
					<span className="form_input_title">{t("description")}</span>

					<textarea
						required
						className="form_input h-[100px] min-h-[50px]"
						id="prompt-description"
						maxLength={POST_LIMITS.descriptionMax}
						minLength={POST_LIMITS.descriptionMin}
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

				{/* {post.aiCategory === AiCategories.CHAT && ( */}
				<label htmlFor="prompt-link">
					<span
						className="form_input_title"
						style={{
							opacity: 0.75,
							filter: "sepia(.4)",
						}}
					>
						{post.aiCategory === AiCategories.CHAT && t("linkLabel")}
						{post.aiCategory === AiCategories.IMAGE && t("srcLabel")}
					</span>

					<input
						className="form_input"
						id="prompt-link"
						placeholder={t("linkPlaceholder")}
						type="url"
						value={post.link}
						onChange={(e) => setPost({ ...post, link: e.target.value })}
					/>
					{displayAnError("link")}
				</label>
				{/* )} */}

				{post.aiCategory === AiCategories.IMAGE && (
					<label htmlFor="prompt-image">
						<span
							className="form_input_title"
							style={{
								opacity: 0.75,
								filter: "sepia(.4)",
							}}
						>
							{t("imageLabel")}
						</span>

						<div className="input_file_wrapper">
							<input
								accept="image/*"
								id="prompt-image"
								placeholder={t("imagePlaceholder")}
								type="file"
								// value={fileName}
								onChange={handleFileUploadChange}
							/>
							{postImageFilename && !haveError("image") ? (
								<IconEmbedSvg height={28} type="cloud-check" width={40} />
							) : (
								<IconEmbedSvg height={28} type="cloud-arrow-up" width={40} />
							)}
							<p className="max-w-[70%] overflow-hidden text-ellipsis">
								{postImageFilename || t("imageNoFile")}
							</p>
						</div>
						{displayAnError("image")}
					</label>
				)}

				<div className="flex justify-between items-start gap-4 flex-col xs:flex-row">
					<div className="text-mlt-dark-6 font-semibold w-full pl-0.5">
						<CheckList
							handleAssign={handlePostAiCategoryChange}
							icon={{ size: 22, color: "mlt-orange-secondary" }}
							items={genAiCategoryList(post.aiCategory)}
							type="singleSelect"
						/>
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
				</div>
			</form>
		</section>
	);
};

export default Form;
