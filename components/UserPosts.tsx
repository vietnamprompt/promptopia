import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import logo from "@/public/icons/svg/mlt.promptopia.logo.favicon.svg";

import { UserProfileType } from "@/interfaces/Profile";

import Header from "./Header";
import PostCardList from "./PostCardList";
import ProfileTabs from "./ProfileTabs";
import FollowButton from "./fragments/FollowButton";
import { usePromptopiaContext } from "@/contexts/PromptopiaContext";
import SocialLinks from "./SocialLinks";

const UserPosts: React.FC<UserProfileType> = ({ user, posts }) => {
	const t = useTranslations("Profile");
	const { session } = usePromptopiaContext();
	const isOwner = !!user?._id && session?.user?.id === user._id;

	return (
		<section className="page_section_left w-full">
			<Header
				desc={
					user?.description
						? `${user?.description.replace(/\.$/, "")}.`
						: t("placeholderUserDescription")
				}
				gradient="blue_gradient"
				textStyle="text-left"
				titleGradient={user?.name ?? t("placeholderUser")}
			/>

			{user?._id && (
				<div className="mt-6 flex items-center gap-4">
					<Image
						unoptimized
						alt={t("altAvatar")}
						className="h-16 w-16 rounded-full bg-white object-cover"
						height={64}
						src={user?.image || logo}
						width={64}
					/>

					<div className="flex flex-col gap-2">
						<p className="font-semibold text-mlt-dark-2">@{user?.username}</p>

						{/* The follow button is before the icons of the links. */}
						<div className="flex flex-wrap items-center gap-2">
							<FollowButton userId={user._id} />
							<SocialLinks className="" links={user?.socialLinks} />
						</div>
					</div>
				</div>
			)}

			{user?._id && (
				<ProfileTabs
					isOwner={isOwner}
					postsContent={<PostCardList data={posts} />}
					showSaved={isOwner || !!user.savedPublic}
					userId={user._id}
				/>
			)}
		</section>
	);
};

export default UserPosts;
