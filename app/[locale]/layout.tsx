import type { Metadata } from "next";
import { NextIntlClientProvider, useLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Inter } from "next/font/google";

import { PromptopiaContextProvider } from "@/contexts/PromptopiaContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import AuthSessionProvider from "@/contexts/AuthSessionProvider";
import { SeoLocale } from "@/interfaces/SiteSettings";
import { getSiteSettings } from "@/lib/site-settings";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"] });

// The name, the logo and the SEO texts are set by the admins, they must not be frozen at build time.
export const dynamic = "force-dynamic";

const LOCALES = ["en", "vi"];

function getMetadataBase() {
	try {
		return new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000");
	} catch (error) {
		return undefined;
	}
}

export async function generateMetadata({
	params,
}: {
	params: { locale: string };
}): Promise<Metadata> {
	const locale = (LOCALES.includes(params?.locale) ? params.locale : "en") as SeoLocale;
	const settings = await getSiteSettings();
	const messages = (await import(`@/messages/${locale}.json`)).default;
	const seo = settings.seo[locale];

	const heroLine1 = settings.heroLine1 || messages.Home.headingLn1;
	const heroLine2 = settings.heroLine2 || messages.Home.headingLn2;
	const title = seo.title || `${settings.siteName} - ${heroLine1} ${heroLine2}`;
	const description = seo.description || settings.heroDescription || messages.Home.subHeading;

	return {
		metadataBase: getMetadataBase(),
		title,
		description,
		keywords: seo.keywords || undefined,
		icons: settings.logoUrl ? { icon: settings.logoUrl, apple: settings.logoUrl } : undefined,
		openGraph: {
			title,
			description,
			siteName: settings.siteName,
			type: "website",
			images: settings.logoUrl ? [settings.logoUrl] : undefined,
		},
		verification: settings.googleVerification ? { google: settings.googleVerification } : undefined,
	};
}

interface LocaleLayoutProps {
	children: React.ReactNode;
	params: {
		locale: string;
	};
}

const LocaleLayout: React.FC<LocaleLayoutProps> = async ({ children, params }) => {
	const locale = useLocale();

	// Show a 404 error if the user requests an unknown locale
	if (params.locale !== locale) {
		notFound();
	}

	let messages;

	try {
		messages = (await import(`@/messages/${locale}.json`)).default;
	} catch (error) {
		notFound();
	}

	const settings = await getSiteSettings();

	return (
		<html lang={locale}>
			<body className={inter.className}>
				<AuthSessionProvider>
					<div className="main">
						<div className="gradient" />
					</div>
					<main className="app">
						<NextIntlClientProvider locale={locale} messages={messages}>
							<SiteSettingsProvider
								value={{
									siteName: settings.siteName,
									logoUrl: settings.logoUrl,
									footerText: settings.footerText,
									heroLine1: settings.heroLine1,
									heroLine2: settings.heroLine2,
									heroDescription: settings.heroDescription,
								}}
							>
								<div className="app_inner">
									<PromptopiaContextProvider>
										{settings.announcementEnabled && settings.announcementText && (
											<div className="mt-3 w-full rounded-lg border border-mlt-orange-secondary/40 bg-white/70 px-4 py-2 text-center text-sm font-medium text-mlt-dark-2">
												{settings.announcementText}
											</div>
										)}
										<Nav />
										{children}
									</PromptopiaContextProvider>
								</div>
							</SiteSettingsProvider>
						</NextIntlClientProvider>
					</main>
				</AuthSessionProvider>
			</body>
		</html>
	);
};

export default LocaleLayout;
