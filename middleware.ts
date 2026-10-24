/**
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 * @see https://github.com/pillarjs/path-to-regexp#path-to-regexp-1
 * @see https://next-intl-docs.vercel.app/docs/routing/middleware#example-auth-js
 */

import { NextRequestWithAuth, withAuth } from "next-auth/middleware";
import createIntlMiddleware from "next-intl/middleware";
import { NextMiddlewareResult } from "next/dist/server/web/types";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

const locales = ["en", "vi"];
const publicPages = [
	"/",
	"/login",
	"/user-posts",
	"/privacy-policy",
	"/cookies-consent",
	"/terms-of-use",
];

const intlMiddleware = createIntlMiddleware({
	locales,
	defaultLocale: "en",
});

type AuthMiddleware = (
	request: NextRequestWithAuth | NextRequest,
	event?: NextFetchEvent
) => Promise<NextMiddlewareResult>;

const authMiddleware = withAuth(
	// Note that this callback is only invoked if
	// the `authorized` callback has returned `true`
	// and not for pages listed in `pages`.
	function onSuccess(req) {
		return intlMiddleware(req);
	},
	{
		callbacks: {
			authorized: ({ token }) => token != null,
		},
		pages: {
			// signIn: "/login",
			signIn: "/api/auth/signin",
		},
	}
) as AuthMiddleware;

// The public profile "/@username" is served by "app/[locale]/u/[handle]". The middleware rewrites
// the address to "/{locale}/u/{username}" (the browser keeps showing "/@username").
const PROFILE_PATH = /^\/@[^/]+\/?$/;
// The same profile with the language in the address: "/vi/@username" -> "/@username".
const PROFILE_PATH_WITH_LOCALE = new RegExp(`^/(${locales.join("|")})/(@[^/]+)/?$`);

export default function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	if (PROFILE_PATH.test(pathname)) {
		const fromCookie = req.cookies.get("NEXT_LOCALE")?.value;
		const browser = (req.headers.get("accept-language") ?? "").toLowerCase();
		const locale =
			fromCookie && locales.includes(fromCookie) ? fromCookie : browser.startsWith("vi") ? "vi" : "en";

		const url = req.nextUrl.clone();

		url.pathname = `/${locale}/u/${pathname.slice(2).replace(/\/$/, "")}`;

		// next-intl reads the language of the request from this header.
		const headers = new Headers(req.headers);

		headers.set("X-NEXT-INTL-LOCALE", locale);

		return NextResponse.rewrite(url, { request: { headers } });
	}

	const withLocale = PROFILE_PATH_WITH_LOCALE.exec(pathname);

	if (withLocale) {
		const url = req.nextUrl.clone();

		url.pathname = `/${withLocale[2]}`;

		const response = NextResponse.redirect(url);

		response.cookies.set("NEXT_LOCALE", withLocale[1], {
			path: "/",
			maxAge: 365 * 24 * 60 * 60,
			sameSite: "lax",
		});

		return response;
	}

	const publicPathnameRegex = RegExp(
		`^(/(${locales.join("|")}))?(${publicPages.join("|")})?/?$`,
		"i"
	);
	const isPublicPage = publicPathnameRegex.test(req.nextUrl.pathname);

	if (isPublicPage) {
		return intlMiddleware(req);
	} else {
		return authMiddleware(req);
	}
}

export const config = {
	matcher: ["/((?!api|_next|.*\\..*).*)"],
};
