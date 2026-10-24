"use client";
import React from "react";

import { usePromptopiaContext } from "@/contexts/PromptopiaContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

const Footer: React.FC = () => {
	const { postCardListSize } = usePromptopiaContext();
	const { footerText } = useSiteSettings();

	return (
		<footer className="page_footer" style={{ width: `${postCardListSize ?? 480}px` }}>
			{/* The text is in the first column, at the left side. The other columns only keep the size. */}
			<div className="footer_col">
				<span className="orange_gradient font-inter text-sm font-extrabold">{footerText}</span>
			</div>
			<div className="footer_col footer_col_2" />
			<div className="footer_col footer_col_3" />
		</footer>
	);
};

export default Footer;
