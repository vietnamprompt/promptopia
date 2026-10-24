import React from "react";

import Feed from "@/components/Feed";
import Footer from "@/components/Footer";
import HomeHeader from "@/components/HomeHeader";

const Home: React.FC = () => {
	return (
		<section className="page_section_center">
			<HomeHeader />
			<Feed />
			<Footer />
		</section>
	);
};

export default Home;
