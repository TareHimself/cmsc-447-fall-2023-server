export interface IDatabaseFile {
	id: string;
	file_hash: string;
	file_mime: string;
	file_name: string;
}

export interface IDatabaseLinks {
	id: string;
	file_id: string;
	password: string | null;
	views: string;
	max_views: string;
	downloads: string;
	expire_at: string;
}
