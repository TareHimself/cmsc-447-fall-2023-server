export interface IDatabaseFile {
	id: string;
	fileHash: string;
	fileMime: string;
	fileName: string;
	fileSize: number;
}

export interface IDatabasePasswords {
	id: string;
	salt: string;
	password: string;
}

export interface IDatabaseFileInfo {
	id: string;
	file_id: string;
	views: number;
	maxViews: number;
	downloads: number;
	expire_at: string | null;
}

export interface IDatabaseLinks {
	id: string;
	file_id: string;
	info_id: string;
	createdAt: string;
}
