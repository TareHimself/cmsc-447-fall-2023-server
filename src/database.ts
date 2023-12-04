import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IDatabaseFile, IDatabaseFileInfo, IDatabaseLinks, IDatabasePasswords } from './types';
import { databasePath } from './constants';
import { Sequelize, Model, DataTypes } from "sequelize";
import bcrypt from 'bcrypt';


const db = new Sequelize({
	dialect: 'sqlite',
	storage: path.join(databasePath, 'database')
});

export class DatabaseFileModel extends Model<IDatabaseFile, IDatabaseFile> {

}

export class DatabaseFileInfoModel extends Model<IDatabaseFileInfo, IDatabaseFileInfo> {

}


export class DatabasePasswordsModel extends Model<IDatabasePasswords, IDatabasePasswords> {

}

export class DatabaseLinksModel extends Model<IDatabaseLinks, IDatabaseLinks> {

}

export { db };

db.query("PRAGMA journal_mode=WAL;")

DatabaseFileModel.init({
	id: {
		type: DataTypes.STRING,
		primaryKey: true
	},
	fileHash: {
		type: DataTypes.STRING
	},
	fileMime: {
		type: DataTypes.STRING
	},
	fileName: {
		type: DataTypes.STRING
	},
	fileSize: {
		type: DataTypes.FLOAT
	}
}, { sequelize: db, tableName: "files", timestamps: false })


DatabaseFileInfoModel.init({
	id: {
		type: DataTypes.STRING,
		primaryKey: true
	},
	fileId: {
		type: DataTypes.STRING
	},
	views: {
		type: DataTypes.INTEGER
	},
	maxViews: {
		type: DataTypes.INTEGER
	},
	downloads: {
		type: DataTypes.INTEGER
	},
	expireAt: {
		type: DataTypes.DATE,
		allowNull: true
	}
}, { sequelize: db, tableName: "files_info", timestamps: false })


DatabasePasswordsModel.init({
	id: {
		type: DataTypes.STRING,
		primaryKey: true
	},
	salt: {
		type: DataTypes.STRING
	},
	password: {
		type: DataTypes.STRING,
	},
}, { sequelize: db, tableName: "passwords", timestamps: false })

DatabaseLinksModel.init({
	id: {
		type: DataTypes.STRING,
		primaryKey: true
	},
	fileId: {
		type: DataTypes.STRING
	},
	infoId: {
		type: DataTypes.STRING
	},
	createdAt: {
		type: DataTypes.DATE,
	}
}, { sequelize: db, tableName: "links", timestamps: false })

Promise.all([DatabaseLinksModel.sync(),
DatabaseFileInfoModel.sync(),
DatabasePasswordsModel.sync(),
DatabaseFileModel.sync()])

export async function createFile(fileHash: string, fileMime: string, fileName: string, fileSize: number) {
	const fileId = uuidv4().replaceAll('-', '');
	await DatabaseFileModel.create({
		id: fileId,
		fileHash: fileHash,
		fileMime: fileMime,
		fileName: fileName,
		fileSize: fileSize
	})

	return fileId;
}

export async function createFileInfo(
	fileId: string,
	password: string | null,
	max_views: number,
	expire_at: string | null
) {
	const linkId = uuidv4().replaceAll('-', '');

	await DatabaseFileInfoModel.create({
		id: linkId,
		fileId: fileId,
		views: 0,
		maxViews: max_views,
		expireAt: expire_at,
		downloads: 0,
	})

	if (password !== null) {
		const salt = await bcrypt.genSalt();

		const hashedPassword = await bcrypt.hash(password, salt!);

		await DatabasePasswordsModel.create({
			id: linkId,
			salt: salt,
			password: hashedPassword
		})
	}

	return linkId;
}

export async function checkPassword(infoId: string, password: string | null) {


	const passwordInfo = await DatabasePasswordsModel.findByPk(infoId).then(c => c?.get({ plain: true }))

	if (passwordInfo === undefined) return true;


	try {
		const hashedPassword = await bcrypt.hash(password!, passwordInfo!.salt);


		return passwordInfo?.password === hashedPassword;
	} catch (error) {
		return false;
	}
}

export async function createDownloadUrlForFile(
	fileInfoId: string,
	password: string | null,
) {
	const linkId = uuidv4().replaceAll('-', '');

	const fileInfo = await DatabaseFileInfoModel.findByPk(fileInfoId).then(c => c?.get({ plain: true }));

	if (!fileInfo) {
		throw new Error("File does not exist")
	}

	if (await checkPassword(fileInfoId, password).then(c => !c)) {
		throw new Error("Incorrect Password")
	}

	await DatabaseLinksModel.create({
		id: linkId,
		fileId: fileInfo.fileId,
		infoId: fileInfo.id,
		createdAt: new Date().toUTCString()
	})

	return linkId;
}

export async function accessFileInfo(infoId: string, password: string | null) {
	const data = await DatabaseFileInfoModel.findByPk(infoId).then(c => c?.get({ plain: true }))

	if (data === undefined) {
		throw new Error(`File does not exist`)
	}

	if (data.expireAt) {
		const expireDate = new Date(data.expireAt)

		if (expireDate < new Date()) {

			await DatabaseFileInfoModel.destroy({
				where: {
					id: data.id
				}
			})
			throw new Error(`File does not exist`)
		}
	}

	if (data.maxViews !== 0 && data.views >= data.maxViews) {
		await DatabaseFileInfoModel.destroy({
			where: {
				id: data.id
			}
		})
		throw new Error(`File does not exist`)
	}

	if (await checkPassword(infoId, password)) {

		await DatabaseFileInfoModel.update({
			views: data.views + 1
		}, {
			where: {
				id: data.id
			}
		})

		return await DatabaseFileInfoModel.findByPk(infoId).then(c => c?.get({ plain: true }))!;
	}

	throw new Error("Incorrect Password")
}

export async function getFileData(fileId: string) {
	return await DatabaseFileModel.findByPk(fileId).then(c => c?.get({ plain: true }))
}

export async function getDownloadInfo(downloadId: string) {
	const downloadInfo = await DatabaseLinksModel.findByPk(downloadId).then(c => c?.get({ plain: true }))
	if (!downloadInfo) {
		throw new Error("Link does not exist")
	}

	const fileLifeHrs = (Math.abs((new Date().getTime() - new Date(downloadInfo.createdAt).getTime()) / 1000) / 60) / 60

	if (fileLifeHrs > 5) {
		DatabaseLinksModel.destroy({
			where: {
				id: downloadInfo.id
			}
		})
		throw new Error("Link has expired")
	}


	const fileInfo = await DatabaseFileModel.findByPk(downloadInfo.fileId).then(c => c?.get({ plain: true }))

	if (!fileInfo) {
		throw new Error("File does not exist")
	}

	return fileInfo
}