// The type is detected by the content of the file, the type declared by the browser is not trusted.
// SVG is not allowed on purpose: an SVG can contain scripts.
export function detectImageType(bytes: Uint8Array): string | null {
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return "image/jpeg";
	}

	if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
		return "image/png";
	}

	// GIF: "GIF8"
	if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
		return "image/gif";
	}

	// WebP: "RIFF" .... "WEBP"
	if (
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return "image/webp";
	}

	return null;
}

// Vercel does not accept a request body bigger than 4.5 MB.
export const POST_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
