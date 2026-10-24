import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import Link from "next/link";

import { PostStatus, PostTypeFromDb } from "@/interfaces/Post";
import logo from "@/public/icons/svg/mlt.promptopia.logo.favicon.svg";
import { Path } from "@/interfaces/Path";
import { profileHref } from "@/lib/profile-url";
import { postPath } from "@/lib/post-url";
import { usePromptopiaContext } from "@/contexts/PromptopiaContext";

import Btn_PostTag from "./fragments/Btn_PostTag";
import IconEmbedSvgPop from "./fragments/IconEmbedSvgPop";
import Btn_PostActions from "./fragments/Btn_PostActions";
import SharePlatformButtons from "./fragments/SharePlatformButtons";
import FollowButton from "./fragments/FollowButton";
import SaveButton from "./fragments/SaveButton";

interface PostCardProps {
	post: PostTypeFromDb;
	copied: string;
	setCopied: React.Dispatch<React.SetStateAction<string>>;
	handleTagClick?: (tag: string) => void;
	handleEdit?: (post: PostTypeFromDb) => void;
	handleDelete?: (post: PostTypeFromDb) => void;
	// The page of one prompt: all prompts are open, the text is not cut and the title is the main heading.
	detail?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({
	post,
	copied,
	setCopied,
	handleTagClick,
	handleEdit,
	handleDelete,
	detail = false,
}) => {
	const t = useTranslations("PostCard");
	const locale = useLocale();
	const pathName = usePathname();
	const { session } = usePromptopiaContext();
	const lastSegment = pathName.split("/").at(-1);
	// The owner can edit and delete the posts on the profile page and on the page "my posts".
	const isEditMode =
		session?.user?.id === post.creator._id &&
		(lastSegment === Path.PROFILE.split("/").at(-1) || lastSegment === Path.MY_POSTS.split("/").at(-1));
	const isDelMode =
		session?.user?.id === post.creator._id &&
		pathName.split("/").at(-1) === Path.POST_DELETE.split("/").at(-1);

	// The creator sees the status of his posts on the profile page.
	// The old posts (without status) are handled as "pending".
	const status: PostStatus = post.status ?? PostStatus.PENDING;
	const statusStyles: Record<PostStatus, string> = {
		[PostStatus.PENDING]: "text-amber-600",
		[PostStatus.APPROVED]: "text-green-600",
		[PostStatus.REJECTED]: "text-red-600",
	};

	// The follow, copy and save buttons are only for the published posts.
	const showActions =
		!isDelMode && post.status !== PostStatus.PENDING && post.status !== PostStatus.REJECTED;

	const [copyCount, setCopyCount] = useState(post.copyCount ?? 0);
	const copySent = useRef(false);

	useEffect(() => {
		setCopyCount(post.copyCount ?? 0);
	}, [post.copyCount]);

	// The server decides if the copy counts (once per viewer per 24 hours, not the author).
	// The browser asks only once per card, the next clicks would not change anything.
	const countCopy = async () => {
		if (copySent.current || isEditMode || isDelMode || post.status === PostStatus.PENDING) {
			return;
		}

		copySent.current = true;

		try {
			const response = await fetch(`/api/copies/${post._id}`, { method: "POST" });

			if (response.ok) {
				const data = await response.json();

				if (typeof data.copyCount === "number") {
					setCopyCount(data.copyCount);
				}
			}
		} catch (error) {
			console.error(error);
		}
	};

	const copyText = (text: string) => {
		if (setCopied === undefined) {
			return;
		}

		setCopied(text);
		navigator.clipboard.writeText(text);
		countCopy();
		setTimeout(() => {
			setCopied("");
		}, 3500);
	};

	const handlePromptCopy = () => copyText(post.prompt);

	// A post can have more prompts after the first one (a chain). The card shows only the first
	// prompt, the button "Show all prompts" opens the others.
	const morePrompts = (post.morePrompts ?? []).filter((item) => item?.prompt);
	const promptsTotal = 1 + morePrompts.length;
	const [showAllPrompts, setShowAllPrompts] = useState(detail);
	const purple = isEditMode || isDelMode;

	// All prompts in one text, separated by a line, for the visitors who paste them at once.
	const copyAllPrompts = () =>
		copyText([post.prompt, ...morePrompts.map((item) => item.prompt)].join("\n\n---\n\n"));

	return (
		<div className={`${isDelMode ? "post_card_del_mode" : "post_card"}`}>
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					<Link href={profileHref(post.creator)}>
						<div className="flex justify-center items-center w-14 h-14 cursor-pointer rounded-full z-10 bg-white min-w-[3.5rem] min-h-[3.5rem] relative">
							<Image
								unoptimized
								alt={t("altProfilePicture")}
								className="rounded-full object-contain"
								height={45}
								src={post?.creator?.image ?? logo}
								width={45}
							/>
						</div>
					</Link>

					<div className="flex min-w-0 flex-col items-start justify-center gap-1.5 self-stretch">
						<Link
							className="max-w-full"
							href={profileHref(post.creator)}
						>
							<h2 className="font-satoshi font-semibold text-mlt-dark-2 text-ellipsis overflow-hidden whitespace-nowrap">
								@{post?.creator?.username ?? t("defaultUsername")}
							</h2>
						</Link>

						{showActions && <FollowButton userId={post.creator._id} />}
					</div>
				</div>

				{showActions && (
					<div className="flex shrink-0 items-center gap-3 pt-1">
						<span
							className="flex items-center gap-1 text-sm text-mlt-dark-6"
							title={t("copyCount", { count: copyCount })}
						>
							<svg
								fill="none"
								height="16"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								viewBox="0 0 24 24"
								width="16"
							>
								<rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
							</svg>
							{copyCount}
						</span>

						<SaveButton count={post.savedCount} postId={post._id} />
					</div>
				)}
			</div>

			{(post.title || post.description) && (
				<div className="mt-5">
					{post.title &&
						(detail ? (
							<h1 className="font-satoshi break-words text-2xl font-bold leading-snug text-mlt-dark-2">
								{post.title}
							</h1>
						) : (
							<h3 className="font-satoshi break-words text-lg font-semibold leading-snug text-mlt-dark-2">
								<Link className="hover:text-mlt-orange-secondary" href={`/${locale}${postPath(post)}`}>
									{post.title}
								</Link>
							</h3>
						))}
					{post.description && (
						<p className="mt-1 whitespace-pre-line break-words text-sm text-mlt-dark-6">
							{post.description}
						</p>
					)}
				</div>
			)}

			{post?.image?._id && (
				<div className="post_card_image_container">
					<Image
						alt={t("altPromptImage")}
						className="post_card_image"
						height={300}
						priority={isDelMode ? true : false}
						src={post.image ? `/api/files/id/${post.image._id}` : logo}
						width={300}
					/>
				</div>
			)}

			<div
				className={`post_card_prompt !rounded-xl border border-mlt-gray-5/70 !bg-white/35 hover:!bg-white/55 !pl-5 !pt-5 ${
					post?.image ? "-mt-6 post_card_prompt_wit_image after:!rounded-xl after:!rounded-b-none" : "mt-6"
				}`}
			>
				{/* The copy button sits on the rounded corner of the prompt, its effect is easy to see. */}
				<IconEmbedSvgPop
					bgColor={isEditMode || isDelMode ? "bg-mlt-purple-secondary" : "bg-mlt-orange-secondary"}
					c1={isEditMode || isDelMode ? "mlt-purple-secondary" : "mlt-orange-secondary"}
					c2={isEditMode || isDelMode ? "mlt-purple-primary" : "mlt-orange-dark"}
					height={20}
					isActive={copied === post.prompt}
					op1="84"
					style={{
						position: "absolute",
						left: "-12px",
						top: "-12px",
						width: "36px",
						height: "36px",
						background: "#ffffff",
						border: "1px solid rgba(0, 0, 0, 0.12)",
						boxShadow: "none",
						zIndex: 3,
					}}
					text={t("altCopyPrompt")}
					type={copied === post.prompt ? "clipboard-check" : "clipboard"}
					width={20}
					onClick={handlePromptCopy}
				/>

				<p
					className={`post_card_prompt_text whitespace-pre-wrap break-words ${detail ? "" : "max-h-[146px]"}`}
					onClick={handlePromptCopy}
				>
					{post.prompt}
				</p>
				{post?.link && (
					<a
						aria-label={t("linkAreaLabel")}
						href={post.link}
						rel="noreferrer"
						style={{ display: "table-cell" }}
						target="_blank"
					>
						<IconEmbedSvgPop
							bgColor="bg-mlt-purple-secondary"
							c1="mlt-purple-secondary"
							c2="mlt-purple-secondary"
							height={18}
							op1="84"
							style={{
								width: "36px",
								height: "36px",
								position: "absolute",
								float: "right",
								right: "4px",
								top: "4px",
							}}
							stylePosWrapper={{ transform: "translate(0, 0)" }}
							text={t("altCopyPrompt")}
							type={"up-right-from-square"}
							width={18}
							wrapperClass="none"
						/>
					</a>
				)}
			</div>

			{morePrompts.length > 0 && (
				<div className="mb-4 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
					<span className="text-sm font-medium text-mlt-dark-6">
						{t("promptsCount", { count: promptsTotal })}
					</span>

					{!detail && (
					<button
						aria-expanded={showAllPrompts}
						className="rounded-full border border-mlt-orange-secondary bg-white px-3 py-1 text-sm font-medium text-mlt-orange-secondary transition hover:bg-mlt-orange-secondary hover:text-white"
						type="button"
						onClick={() => setShowAllPrompts(!showAllPrompts)}
					>
						{showAllPrompts ? t("showLess") : t("showAllPrompts")}
					</button>
					)}

					{showAllPrompts && (
						<button
							className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-mlt-dark-4 transition hover:border-mlt-orange-secondary hover:text-mlt-orange-secondary"
							type="button"
							onClick={copyAllPrompts}
						>
							{t("copyAll")}
						</button>
					)}
				</div>
			)}

			{showAllPrompts &&
				morePrompts.map((item, index) => (
					<div key={`${index}-${item.title}`} className="mt-6">
						<h4 className="font-satoshi break-words text-base font-semibold text-mlt-dark-2">
							{index + 2}. {item.title}
						</h4>

						<div className="post_card_prompt !rounded-xl border border-mlt-gray-5/70 !bg-white/35 hover:!bg-white/55 relative mt-3 !pl-5 !pt-5">
							<IconEmbedSvgPop
								bgColor={purple ? "bg-mlt-purple-secondary" : "bg-mlt-orange-secondary"}
								c1={purple ? "mlt-purple-secondary" : "mlt-orange-secondary"}
								c2={purple ? "mlt-purple-primary" : "mlt-orange-dark"}
								height={20}
								isActive={copied === item.prompt}
								op1="84"
								style={{
									position: "absolute",
									left: "-12px",
									top: "-12px",
									width: "36px",
									height: "36px",
									background: "#ffffff",
									border: "1px solid rgba(0, 0, 0, 0.12)",
						boxShadow: "none",
									zIndex: 3,
								}}
								text={t("altCopyPrompt")}
								type={copied === item.prompt ? "clipboard-check" : "clipboard"}
								width={20}
								onClick={() => copyText(item.prompt)}
							/>

							<p
								className={`post_card_prompt_text whitespace-pre-wrap break-words ${detail ? "" : "max-h-[146px]"}`}
								onClick={() => copyText(item.prompt)}
							>
								{item.prompt}
							</p>
						</div>
					</div>
				))}

			<SharePlatformButtons platforms={post.sharePlatforms} prompt={post.prompt} />

			{isEditMode && (
				<p className={`mb-3 text-sm font-semibold ${statusStyles[status]}`}>
					{t(`status.${status}`)}
				</p>
			)}

			<p className="post_buttons_list">
				{(post.tags as string[]).map((tag: string, index) => (
					<Btn_PostTag
						key={index}
						c1={isEditMode || isDelMode ? "mlt-purple-secondary" : "mlt-orange-secondary"}
						c2={isEditMode || isDelMode ? "mlt-purple-secondary" : "mlt-orange-secondary"}
						text={tag}
						onClick={() => handleTagClick && handleTagClick(tag)}
					/>
				))}
			</p>

			{isEditMode && (
				<div className="post_card_edit_section">
					<Btn_PostActions
						icon={{ type: "trash", style: { transform: "translateY(-1.5px)" } }}
						text={t("delete")}
						onClick={() => handleDelete && handleDelete(post)}
					/>
					<Btn_PostActions
						icon={{ type: "brush", style: { transform: "translateY(-1px)" } }}
						text={t("edit")}
						onClick={() => handleEdit && handleEdit(post)}
					/>
				</div>
			)}
		</div>
	);
};

export default PostCard;
