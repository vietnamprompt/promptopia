import React from "react";
import "./globals.css";

// This is an example for static MetaData added to a specific page
// Actually it will not be displayed because our App structure is nested
// within the [locale] folder and the metadata is overwritten there.
export const metadata = {
	title: "Việt Nam Prompt AI",
	description: "Kho Prompt Tiếng Việt dành cho bạn",
};

interface RootLayoutProps {
	children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
	return children;
}
