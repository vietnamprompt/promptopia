import { SocialLinksType } from "@/interfaces/SocialLinks";

export interface UserType {
	email?: string; // public only if the user has chosen to show it
	username: string;
	usernameChosen?: boolean;
	showEmail?: boolean;
	name: string;
	image: string;
	accountProvider?: string; // private, not sent to the visitors
	description?: string;
	socialLinks?: SocialLinksType;
	followersCount?: number;
	savedPublic?: boolean; // the saved posts are visible on the public profile
}

export interface UserTypeFromDb extends UserType {
	_id: string;
}
