import React from "react";
import { useTranslations } from "next-intl";

import { UserProfileType } from "@/interfaces/Profile";

import Header from "./Header";
import ProfileSettings from "./ProfileSettings";
import PostCardList from "./PostCardList";
import ProfileTabs from "./ProfileTabs";

const UserProfile: React.FC<UserProfileType> = ({ user, posts }) => {
	const t = useTranslations("Profile");

	return (
		<section className="page_section_left w-full">
			<Header
				desc={t("description")}
				gradient="blue_gradient"
				textStyle="text-left"
				titleGradient={user?.name ?? ""}
			/>

			<ProfileSettings />

			<p className="mt-8 max-w-md text-sm text-mlt-dark-6">{t("moderationNote")}</p>

			{user?._id && (
				<ProfileTabs
					isOwner
					postsContent={<PostCardList data={posts} />}
					showSaved
					userId={user._id}
				/>
			)}
		</section>
	);
};

export default UserProfile;
