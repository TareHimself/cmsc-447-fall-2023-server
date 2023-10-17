import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import * as fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import {
	accessLink,
	createFile,
	createFileUrl,
	getFileData,
	db,
} from './database';
import { builResponse } from './utils';
import { IDatabaseFile, IDatabaseLinks } from './types';
import { filesPath, isDebug } from './constants';
const serverAddress = isDebug
	? 'http://localhost:9500/'
	: 'https://447-api.oyintare.dev/';
const app = express();
const upload = multer({ dest: 'uploads/' });

app.get('/', (_req, res) => {
	res.send(
		builResponse(
			{
				name: 'CMSC 447 FileCher Server',
				files: (
					db.prepare('SELECT * FROM files').all() as IDatabaseFile[]
				).map((a) => {
					return {
						...a,
						links: (
							db
								.prepare(
									'SELECT * FROM links WHERE file_id=@id'
								)
								.all({
									id: a.id,
								}) as IDatabaseLinks[]
						).map((c) => {
							return {
								...c,
								url: serverAddress + 'info/' + c.id,
							};
						}),
					};
				}),
			},
			false
		)
	);
});

app.put('/upload', upload.single('file'), async (req, res) => {
	try {
		const file = req.file;
		if (!file) {
			throw new Error('Missing File');
		}

		const fileHash = await new Promise<string>((res) => {
			const hash = crypto.createHash('sha256');

			const stream = fs.createReadStream(file.path);
			stream.on('data', (d) => {
				hash.update(d);
			});

			stream.on('end', () => {
				res(hash.digest('hex'));
			});
		});

		const formData = req.body;
		const password = formData['password']
			? await bcrypt.hash(
					formData['password'],
					formData['password'].length
			  )
			: null;
		const maxViews = formData['maxViews']
			? parseInt(formData['maxViews'])
			: 0;
		const expireAt = formData['expire'] ? parseInt(formData['expire']) : 0;

		const fileId = createFile(fileHash, file.mimetype, file.originalname);

		const urlId = createFileUrl(fileId, password, maxViews, expireAt);

		await fs.promises.rename(file.path, path.join(filesPath, fileHash));

		res.send(
			builResponse(
				{
					id: urlId,
					url: serverAddress + `info/${urlId}`,
					hash: fileHash,
				},
				false
			)
		);
	} catch (error) {
		console.error(error);
		res.status(500);
		if (error instanceof Error) {
			res.send(builResponse(error.message, true));
		} else {
			res.send(builResponse('Unknown Error', true));
		}
	}
});

app.get('/info/:linkId', async (req, res) => {
	try {
		const linkId = req.params.linkId;

		const linkData = accessLink(linkId);

		if (!linkData) {
			throw new Error(`Link Does Not Exist ${linkId}`);
		}

		const fileData = getFileData(linkData.file_id);

		if (!fileData) {
			throw new Error('File Does Not Exist');
		}

		res.send(
			builResponse(
				{
					filename: fileData.file_name,
					mime: fileData.file_mime,
					views: linkData.views,
					downloads: linkData.downloads,
					expire_at: linkData.expire_at,
					access_url: serverAddress + `access/${linkId}`,
				},
				false
			)
		);
	} catch (error) {
		console.error(error);
		res.status(500);
		if (error instanceof Error) {
			res.send(builResponse(error.message, true));
		} else {
			res.send(builResponse('Unknown Error', true));
		}
	}
});

app.get('/access/:linkId', async (req, res) => {
	try {
		const linkId = req.params.linkId;

		const linkData = accessLink(linkId);

		if (!linkData) {
			throw new Error(`Link Does Not Exist ${linkId}`);
		}

		const fileData = getFileData(linkData.file_id);

		if (!fileData) {
			throw new Error('File Does Not Exist');
		}

		// const ranges =
		// 	req.headers.range
		// 		?.split('-')
		// 		.map((a) => parseInt(a.replace('bytes=', '')))
		// 		.filter((c) => !isNaN(c))
		// 		.reduce((t, c) => {
		// 			t.push(c);
		// 			return t;
		// 		}, [] as number[]) ?? [];

		res.contentType(fileData.file_mime);
		res.sendFile(path.resolve(path.join(filesPath, fileData.file_hash)));
		// const fileStream = fs.createReadStream(
		// 	path.resolve(path.join('files', fileData.file_hash))
		// 	// {
		// 	// 	start: ranges[0],
		// 	// 	end: ranges[1],
		// 	// }
		// );
		// fileStream.pipe(res);
	} catch (error) {
		console.error(error);
		res.status(500);
		if (error instanceof Error) {
			res.send(builResponse(error.message, true));
		} else {
			res.send(builResponse('Unknown Error', true));
		}
	}
});

app.listen(isDebug ? 9500 : 11000, () => {
	console.log(`Server Online On Port ${isDebug ? 9500 : 11000}`);
});
