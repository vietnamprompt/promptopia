/**
 * The admins are defined by the environment variable ADMIN_EMAILS
 * (the e-mails are comma separated), i.e.:
 * ADMIN_EMAILS=first@gmail.com,second@gmail.com
 */
export function isAdminEmail(email?: string | null): boolean {
	if (!email) {
		return false;
	}

	const admins = String(process.env.ADMIN_EMAILS ?? "")
		.split(",")
		.map((item) => item.trim().toLowerCase())
		.filter(Boolean);

	return admins.includes(email.trim().toLowerCase());
}
