import Database from 'better-sqlite3';
import path from 'path';
import cluster from 'cluster';
import { v4 as uuidv4 } from 'uuid';
import { IDatabaseFile, IDatabaseLinks } from './types';
import { databasePath } from './constants';

const db = new Database(path.join(databasePath, 'database'));

export { db };

db.pragma('journal_mode = WAL');

if (cluster.isPrimary) {
	db.transaction(() => {
		db.prepare(
			`CREATE TABLE IF NOT EXISTS files(
            id TEXT PRIMARY KEY,
            file_hash TEXT NOT NULL,
            file_mime TEXT NOT NULL,
            file_name TEXT NOT NULL
        ) WITHOUT ROWID`
		).run();

		db.prepare(
			`CREATE TABLE IF NOT EXISTS links(
            id TEXT PRIMARY KEY,
            file_id REFERENCES files(id),
            password TEXT,
            views INTEGER DEFAULT 0,
            max_views INTEGER DEFAULT 0,
            downloads INTEGER DEFAULT 0,
            expire_at INTEGER DEFAULT 0
        ) WITHOUT ROWID`
		).run();
	}).immediate();
}

const insertFileStatement = db.prepare<{
	id: string;
	file_hash: string;
	file_mime: string;
	file_name: string;
}>('INSERT INTO files VALUES(@id,@file_hash,@file_mime,@file_name)');

const getFileStatement = db.prepare<{
	id: string;
}>('SELECT * FROM files WHERE id=@id');

const insertLinkStatement = db.prepare<{
	id: string;
	file_id: string;
	password: string | null;
	views: number;
	max_views: number;
	downloads: number;
	expire_at: number;
}>(
	'INSERT INTO links VALUES(@id,@file_id,@password,@views,@max_views,@downloads,@expire_at)'
);

const getLinkWithIdStatement = db.prepare<{
	id: string;
}>(`SELECT * FROM links WHERE id=@id`);

export const createFile = db.transaction(
	(fileHash: string, fileMime: string, fileName: string) => {
		const fileId = uuidv4().replaceAll('-', '');
		insertFileStatement.run({
			id: fileId,
			file_hash: fileHash,
			file_mime: fileMime,
			file_name: fileName,
		});

		return fileId;
	}
);

export const createFileUrl = db.transaction(
	(
		fileId: string,
		password: string | null,
		max_views: number,
		expire_at: number
	) => {
		const linkId = uuidv4().replaceAll('-', '');
		insertLinkStatement.run({
			id: linkId,
			file_id: fileId,
			password: password,
			views: 0,
			downloads: 0,
			max_views: max_views,
			expire_at: expire_at,
		});

		console.log(linkId);

		return linkId;
	}
);

export const accessLink = db.transaction((linkId: string) => {
	const targetLink = getLinkWithIdStatement.all({
		id: linkId,
	})[0] as IDatabaseLinks | undefined;
	// console.log(db.prepare('SELECT * FROM links').all());
	if (!targetLink) {
		return undefined;
	}

	return targetLink;
});

export function getFileData(fileId: string) {
	return getFileStatement.all({
		id: fileId,
	})[0] as IDatabaseFile | undefined;
}
