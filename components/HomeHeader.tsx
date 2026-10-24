"use client";
import React from "react";
import { useTranslations } from "next-intl";

import { useSiteSettings } from "@/contexts/SiteSettingsContext";

import Header from "./Header";

/** The big heading of the homepage. The texts can be changed by the admins (Admin > Settings). */
const HomeHeader: React.FC = () => {
	const t = useTranslations("Home");
	const { heroLine1, heroLine2, heroDescription } = useSiteSettings();

	return (
		<Header
			desc={heroDescription || t("subHeading")}
			titleBlack={heroLine1 || t("headingLn1")}
			titleGradient={heroLine2 || t("headingLn2")}
		/>
	);
};

export default HomeHeader;
