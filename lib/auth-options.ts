import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import User from "@/models/user";

import type { NextAuthOptions } from "next-auth";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } =
	process.env;

export const authOptions: NextAuthOptions = {
	session: {
		strategy: "jwt",
	},
	providers: [
		GoogleProvider({
			clientId: String(GOOGLE_CLIENT_ID),
			clientSecret: String(GOOGLE_CLIENT_SECRET),
		}),
		GithubProvider({
			clientId: String(GITHUB_CLIENT_ID),
			clientSecret: String(GITHUB_CLIENT_SECRET),
			authorization: { params: { scope: "user:email login name avatar_url" } },
		}),
	],
	secret: process.env.NEXTAUTH_SECRET,
	pages: {
		signIn: '/',
		error: '/',
	},
	callbacks: {
		async session({ session }) {
			try {
				await connectToMongoDb();
				const sessionUser = await User.findOne({ email: session?.user?.email });

				if (sessionUser) {
					session.user.id = sessionUser._id.toString();
					session.user.accountProvider = sessionUser.accountProvider;
					session.user.username = sessionUser.username;
					session.user.description = sessionUser.description;
				}
			} catch (error) {
				console.error("SESSION ERROR:", error);
			}

			return session;
		},
		async signIn({ account, profile }) {
			if (account?.provider === "google" && !profile?.email_verified) {
				return false;
			}

			try {
				await connectToMongoDb();

				const userExist = await User.findOne({ email: profile?.email });

				if (!userExist) {
					const name = String(profile?.name ?? profile?.login ?? profile?.username ?? "User");

					await User.create({
						email: String(profile?.email),
						username: String(
							`${profile?.email}${Math.floor(Math.random() * 10000)}${account?.provider}`
								?.replace(/(\s|\.|-|@)/g, ".")
								.replace(/\.+/g, "")
								.toLocaleLowerCase()
								.replace(/[^a-z0-9]/gi, "")
						),
						name,
						image: String(profile?.picture ?? profile?.image ?? profile?.avatar_url ?? ""),
						accountProvider: String(account?.provider),
						description: "Welcome to my profile!",
					});
				}

				return true;
			} catch (error) {
				console.error("SIGN IN ERROR:", error);
				return true; 
			}
		},
	},
};
