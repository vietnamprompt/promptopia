"use client";

import React, { createContext, useContext } from "react";

import { DEFAULT_SITE_SETTINGS } from "@/interfaces/SiteSettings";

interface SiteContextValue {
	siteName: string;
	logoUrl: string | null;
	footerText: string;
}

const SiteSettingsContext = createContext<SiteContextValue>({
	siteName: DEFAULT_SITE_SETTINGS.siteName,
	logoUrl: null,
	footerText: DEFAULT_SITE_SETTINGS.footerText,
});

/** The name, the logo and the footer text of the site. The layout reads them from the database. */
export const SiteSettingsProvider: React.FC<{
	value: SiteContextValue;
	children: React.ReactNode;
}> = ({ value, children }) => (
	<SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
);

export const useSiteSettings = () => useContext(SiteSettingsContext);
