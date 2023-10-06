import path from 'path';

export const isDebug = process.argv.includes('--debug');

export const databasePath = isDebug
	? path.join('ddata', 'sqlite')
	: path.join('data', 'sqlite');

export const filesPath = isDebug
	? path.join('ddata', 'files')
	: path.join('data', 'files');
