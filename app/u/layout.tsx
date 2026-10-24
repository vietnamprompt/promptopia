/**
 * The layout of the public profiles. The address of a profile is "/@username" (see the "rewrites"
 * in 'next.config.js'), without the language in it, so this layout is outside of "app/[locale]".
 * The language comes from the cookie "NEXT_LOCALE" (set by the language buttons and by the
 * language middleware), or from the language of the browser.
 */
import React from "react";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { Inter } from "next/font/google";

import { PromptopiaContextProvider } from "@/contexts/PromptopiaContext";
import AuthSessionProvider from "@/contexts/AuthSessionProvider";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

const LOCALES = ["en", "vi"];

function getLocale() {
	const fromCookie = cookies().get("NEXT_LOCALE")?.value;

	if (fromCookie && LOCALES.includes(fromCookie)) {
		return fromCookie;
	}

	const browser = (headers().get("accept-language") ?? "").toLowerCase();

	return browser.startsWith("vi") ? "vi" : "en";
}

export async function generateMetadata() {
	const messages = (await import(`@/messages/${getLocale()}.json`)).default;

	return {
		title: `${messages.Site.title} - ${messages.Home.headingLn1} ${messages.Home.headingLn2}`,
		description: messages.Home.subHeading,
	};
}

interface ProfileLayoutProps {
	children: React.ReactNode;
}

const ProfileLayout: React.FC<ProfileLayoutProps> = async ({ children }) => {
	const locale = getLocale();
	const messages = (await import(`@/messages/${locale}.json`)).default;

	return (
		<html lang={locale}>
			<body className={inter.className}>
				<AuthSessionProvider>
					<div className="main">
						<div className="gradient" />
					</div>
					<main className="app">
						<NextIntlClientProvider locale={locale} messages={messages}>
							<div className="app_inner">
								<PromptopiaContextProvider>
									<Nav />
									{children}
								</PromptopiaContextProvider>
							</div>
						</NextIntlClientProvider>
					</main>
				</AuthSessionProvider>
			</body>
		</html>
	);
};

export default ProfileLayout;
