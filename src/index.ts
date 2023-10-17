import * as os from 'os';
import cluster from 'cluster';
import path from 'path';
import * as fs from 'fs';
import { databasePath, filesPath } from './constants';

if (cluster.isPrimary) {
	// Take advantage of multiple CPUs
	const cpus = os.cpus().length;

	[filesPath, databasePath].forEach((p) => {
		if (!fs.existsSync(p)) {
			fs.mkdirSync(p, {
				recursive: true,
			});
		}
	});

	require('./database');

	if (process.argv.includes('--no-cluster')) {
		cluster.fork(process.env);
	} else {
		for (let i = 0; i < Math.max(cpus, 4); i++) {
			cluster.fork(process.env);
		}
	}

	cluster.on('exit', (worker, code) => {
		if (code !== 0 && !worker.exitedAfterDisconnect) {
			cluster.fork();
		}
	});
} else {
	require(path.join(__dirname, 'server'));
}
