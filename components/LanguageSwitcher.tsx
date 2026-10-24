"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";

type AppLocale = "vi" | "en";

const VietnamFlag: React.FC = () => (
	<svg aria-hidden className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 30 20">
		<rect fill="#da251d" height="20" width="30" />
		<polygon
			fill="#ffff00"
			points="15,4 16.76,9.06 22.11,9.17 17.84,12.4 19.39,17.53 15,14.46 10.61,17.53 12.16,12.4 7.89,9.17 13.24,9.06"
		/>
	</svg>
);

const UkFlag: React.FC = () => (
	<svg aria-hidden className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 60 30">
		<rect fill="#012169" height="30" width="60" />
		<path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
		<path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" strokeWidth="2" />
		<path d="M30,0 V30 M0,15 H60" stroke="#ffffff" strokeWidth="10" />
		<path d="M30,0 V30 M0,15 H60" stroke="#c8102e" strokeWidth="6" />
	</svg>
);

const FLAGS: { locale: AppLocale; Flag: React.FC }[] = [
	{ locale: "vi", Flag: VietnamFlag },
	{ locale: "en", Flag: UkFlag },
];

/**
 * Two flags: Vietnamese (/vi) and English (/en). The choice is saved in the cookie "NEXT_LOCALE"
 * (the language middleware and the profile pages "/@username" read it), then the page is opened
 * again in the new language.
 */
const LanguageSwitcher: React.FC = () => {
	const t = useTranslations("Nav");
	const currentLocale = useLocale();

	const handleChoose = (locale: AppLocale) => {
		if (locale === currentLocale) {
			return;
		}

		try {
			document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
		} catch (error) {
			console.error(error);
		}

		const { pathname, search, hash } = window.location;
		// "/en/page" -> "/vi/page". The address of a profile ("/@username") has no language in it.
		const match = /^\/(en|vi)(\/.*)?$/.exec(pathname);
		const newPath = match ? `/${locale}${match[2] ?? ""}` : pathname;

		window.location.assign(`${newPath}${search}${hash}`);
	};

	return (
		<div className="flex items-center gap-2">
			{FLAGS.map(({ locale, Flag }) => {
				const isCurrent = locale === currentLocale;
				const label = locale === "vi" ? t("languageVi") : t("languageEn");

				return (
					<button
						key={locale}
						aria-label={label}
						aria-pressed={isCurrent}
						className={`h-5 w-7 shrink-0 overflow-hidden rounded-sm border transition ${
							isCurrent
								? "border-mlt-orange-secondary opacity-100 ring-2 ring-mlt-orange-secondary/60"
								: "border-gray-300 opacity-60 hover:opacity-100"
						}`}
						title={label}
						type="button"
						onClick={() => handleChoose(locale)}
					>
						<Flag />
					</button>
				);
			})}
		</div>
	);
};

export default LanguageSwitcher;
