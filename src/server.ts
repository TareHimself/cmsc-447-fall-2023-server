import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import * as fs from 'fs';
import path from 'path';
//import cors from 'cors'
import { v4 as uuidv4 } from 'uuid';
import {
	createFile,
	createFileInfo,
	getFileData,
	accessFileInfo,
	createDownloadUrlForFile,
	getDownloadInfo,
} from './database';
import { builResponse} from './utils';
import { filesPath, isDebug } from './constants';

const serverAddress = isDebug
	? 'http://localhost:9500/'
	: 'https://447-api.oyintare.dev/';
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits : {
	fieldSize: 2e+8,
	fieldNameSize: 2e+8,
} });
// app.use(cors({
// 	origin: "*"
// }))
app.use(express.json({ limit: "10000mb"}))
app.use(express.urlencoded({ extended: true,limit: "10000mb"}))

app.use((_req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods","*")
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
  });

app.put('/upload', upload.single('file'), async (req, res) => {
	req.setTimeout(2047483647)
	try {
		const file = req.file;
		
		if (!file) {
			throw new Error('Missing File');
		}

		const tempPath = path.join(filesPath, `temp_${uuidv4().replaceAll('-','')}`)

		await fs.promises.writeFile(tempPath,file.buffer);

		const fileHash = await new Promise<string>((res) => {
			const hash = crypto.createHash('sha256');

			const stream = fs.createReadStream(tempPath);
			stream.on('data', (d) => {
				hash.update(d);
			});

			stream.on('end', () => {
				res(hash.digest('hex'));
			});
		});

		const formData = req.body;

		const password = formData['password'] || null

		const maxViews = formData['maxViews']
			? parseInt(formData['maxViews'])
			: 0;

		
		const expireAt = formData['expire'] && formData['expire'].trim() ? new Date(formData['expire']).toUTCString() : null;

		console.log("Expire date",expireAt,formData['expire'])
		const fileId = await createFile(fileHash, file.mimetype, file.originalname,file.size);

		const fileInfoId = await createFileInfo(fileId, password, maxViews, expireAt);

		await fs.promises.rename(tempPath, path.join(filesPath, fileHash));

		res.send(
			builResponse(
				{
					...(await getFileData(fileId))!,
					id: fileInfoId,
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

app.get('/access/:infoId', async (req, res) => {
	try {
		const infoId = req.params.infoId;

		let password: string | null = req.query.password as (string | undefined) ?? null;

		const infoData = await accessFileInfo(infoId,password);

		if (!infoData) {
			throw new Error(`Link Does Not Exist ${infoId}`);
		}
		

		const fileData = await getFileData(infoData.fileId)

		if (!fileData) {
			throw new Error('File Does Not Exist');
		}

		const downloadUrlId = await createDownloadUrlForFile(infoData.id,password);

		res.send(
			builResponse(
				{
					filename: fileData.fileName,
					mime: fileData.fileMime,
					size: fileData.fileSize,
					views: infoData.views,
					downloads: infoData.downloads,
					expireAt: infoData.expireAt,
					url: serverAddress + `download/${downloadUrlId}`,
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

app.get('/download/:downloadId', async (req, res) => {
	try {
		const downloadId = req.params.downloadId;

		const fileData = await getDownloadInfo(downloadId)

		// const ranges =
		// 	req.headers.range
		// 		?.split('-')
		// 		.map((a) => parseInt(a.replace('bytes=', '')))
		// 		.filter((c) => !isNaN(c))
		// 		.reduce((t, c) => {
		// 			t.push(c);
		// 			return t;
		// 		}, [] as number[]) ?? [];

		

		res.contentType(fileData.fileMime);
		res.set('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
		res.sendFile(path.resolve(path.join(filesPath, fileData.fileHash)));
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
