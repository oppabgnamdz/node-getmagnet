// Type definitions for the application
export interface MagnetItem {
	url: string;
	code: string;
	source: string;
	date?: string;
	hash?: string;
	magnet?: string;
	created_at?: Date;
}

export interface SurritInfo {
	uuidMatches: string[];
	videoFormat: string;
}

export interface VideoData {
	href?: string;
	fullUrl?: string;
}

export interface VideoInfo {
	m3u8UrlsFromVideo: string[];
	scriptContents: string[];
	uuidMatches: string[];
}
