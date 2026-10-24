import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import Link from "next/link";

import { PostStatus, PostTypeFromDb } from "@/interfaces/Post";
import logo from "@/public/icons/svg/mlt.promptopia.logo.favicon.svg";
import { Path } from "@/interfaces/Path";
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
}

const PostCard: React.FC<PostCardProps> = ({
	post,
	copied,
	setCopied,
	handleTagClick,
	handleEdit,
	handleDelete,
}) => {
	const t = useTranslations("PostCard");
	const pathName = usePathname();
	const { session } = usePromptopiaContext();
	const isEditMode =
		session?.user?.id === post.creator._id &&
		pathName.split("/").at(-1) === Path.PROFILE.split("/").at(-1);
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

	const handlePromptCopy = () => {
		if (setCopied === undefined) {
			return;
		}

		setCopied(post.prompt);
		navigator.clipboard.writeText(post.prompt);
		setTimeout(() => {
			setCopied("");
		}, 3500);
	};

	return (
		<div className={`${isDelMode ? "post_card_del_mode" : "post_card"}`}>
			<div className="relative">
				<Link href={`${Path.POSTS}?user_id=${post.creator._id}`}>
					<div className="post_card_header">
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
						<div className="flex flex-col max-w-[100%] overflow-hidden justify-center">
							<h2 className="font-satoshi font-semibold text-mlt-dark-2 pr-7 text-ellipsis overflow-hidden whitespace-nowrap">
								@{post?.creator?.username ?? t("defaultUsername")}
							</h2>
						</div>
					</div>
				</Link>

				<IconEmbedSvgPop
					bgColor={isEditMode || isDelMode ? "bg-mlt-purple-secondary" : "bg-mlt-orange-secondary"}
					c1={isEditMode || isDelMode ? "mlt-purple-secondary" : "mlt-orange-secondary"}
					c2={isEditMode || isDelMode ? "mlt-purple-primary" : "mlt-orange-dark"}
					height={22}
					isActive={copied === post.prompt}
					op1="84"
					style={{ position: "absolute", right: "-6px", top: "-6px" }}
					text={t("altCopyPrompt")}
					type={copied === post.prompt ? "clipboard-check" : "clipboard"}
					width={22}
					onClick={handlePromptCopy}
				/>
			</div>

			{(post.title || post.description) && (
				<div className="mt-5">
					{post.title && (
						<h3 className="font-satoshi break-words text-lg font-semibold leading-snug text-mlt-dark-2">
							{post.title}
						</h3>
					)}
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
				className={`post_card_prompt ${post?.image ? "-mt-6 post_card_prompt_wit_image" : "mt-6"}`}
			>
				<p
					className="post_card_prompt_text max-h-[146px] whitespace-pre-wrap break-words"
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

			<SharePlatformButtons platforms={post.sharePlatforms} prompt={post.prompt} />

			{isEditMode && (
				<p className={`mb-3 text-sm font-semibold ${statusStyles[status]}`}>
					{t(`status.${status}`)}
				</p>
			)}

			{!isDelMode && post.status !== PostStatus.PENDING && post.status !== PostStatus.REJECTED && (
				<div className="mb-3 flex items-center justify-between gap-2">
					<FollowButton userId={post.creator._id} />
					<SaveButton count={post.savedCount} postId={post._id} />
				</div>
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
