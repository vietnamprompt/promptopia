import GoogleProvider from "next-auth/providers/google";
import { connectToMongoDb } from "@/lib/mongodb-mongoose";
import User from "@/models/user";
import type { NextAuthOptions } from "next-auth";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

export const authOptions: NextAuthOptions = {
	session: {
		strategy: "jwt",
	},
	providers: [
		GoogleProvider({
			clientId: String(GOOGLE_CLIENT_ID ?? ""),
			clientSecret: String(GOOGLE_CLIENT_SECRET ?? ""),
		}),
	],
	secret: process.env.NEXTAUTH_SECRET,
	callbacks: {
		async session({ session }) {
			try {
				await connectToMongoDb();
				const sessionUser = await User.findOne({ email: session?.user?.email });

				if (sessionUser && session.user) {
					(session.user as any).id = sessionUser._id.toString();
					(session.user as any).accountProvider = sessionUser.accountProvider;
					(session.user as any).username = sessionUser.username;
					(session.user as any).description = sessionUser.description;
					(session.user as any).role = sessionUser.role || "user";
				}
			} catch (error) {
				console.error("SESSION ERROR:", error);
			}

			return session;
		},
		async signIn({ account, profile }) {
			if (account?.provider === "google" && profile && !("email_verified" in profile && !profile.email_verified)) {
				try {
					await connectToMongoDb();
					const userExist = await User.findOne({ email: profile?.email });

					if (!userExist) {
						const name = String(profile?.name ?? "User");
						await User.create({
							email: String(profile?.email),
							username: String(
								`${profile?.email}${Math.floor(Math.random() * 10000)}google`
									?.replace(/(\s|\.|-|@)/g, ".")
									.replace(/\.+/g, "")
									.toLocaleLowerCase()
									.replace(/[^a-z0-9]/gi, "")
							),
							name,
							image: String((profile as any)?.picture ?? ""),
							accountProvider: "google",
							description: "Hello! I am a new member.",
							role: "user",
						});
					}
					return true;
				} catch (error) {
					console.error("SIGN IN ERROR:", error);
					return true;
				}
			}
			return true;
		},
	},
};
