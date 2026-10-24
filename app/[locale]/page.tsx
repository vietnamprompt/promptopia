import React from "react";
import { useTranslations } from "next-intl";

import Header from "@/components/Header";
import Feed from "@/components/Feed";
import Footer from "@/components/Footer";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const Home: React.FC = () => {
	const t = useTranslations("Home");
	const { heroLine1, heroLine2, heroDescription } = useSiteSettings();

	return (
		<section className="page_section_center">
			<Header
				desc={heroDescription || t("subHeading")}
				titleBlack={heroLine1 || t("headingLn1")}
				titleGradient={heroLine2 || t("headingLn2")}
			/>
			<Feed />
			<Footer />
		</section>
	);
};

export default Home;
