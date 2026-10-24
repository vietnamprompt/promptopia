"use client";

import React from "react";

import { usePromptopiaContext } from "@/contexts/PromptopiaContext";

const Footer: React.FC = () => {
	const { postCardListSize } = usePromptopiaContext();

	return (
		<footer className="page_footer" style={{ width: `${postCardListSize ?? 480}px` }}>
			<div className="footer_col footer_col_1" />
			<div className="footer_col footer_col_2" />
			<div className="footer_col footer_col_3">
				<span className="orange_gradient font-inter text-sm font-extrabold">©2026</span>
			</div>
		</footer>
	);
};

export default Footer;
