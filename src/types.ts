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
	fileId: string;
	views: number;
	maxViews: number;
	downloads: number;
	expireAt: string | null;
}

export interface IDatabaseLinks {
	id: string;
	fileId: string;
	infoId: string;
	createdAt: string;
}
