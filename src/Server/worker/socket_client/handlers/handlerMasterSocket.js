// Dùng để xử lý các event của socket, event khác với các hành động

import { workerConfig } from '../../../shared/config/index.js';
import { parseRule } from '../../engine/ruleMatcher.js';

import { sendToMaster } from '../services/serviceMasterSocket.js';

export default function registerMasterHandler(ws) {
	const MY_WORKER_ID = workerConfig.ID1 || `WORKER-${Math.floor(Math.random() * 1000)}`;

	ws.on('open', () => {
		console.log('[+] Đã kết nối tới Master Node! Đang định danh..');

		ws.send(
			JSON.stringify({
				type: 'REGISTER_WORKER',
				worker_id: MY_WORKER_ID
			})
		);
	});

	ws.on('message', (msg) => {
		try {
			const data = JSON.parse(msg);
			console.log("[Worker] nhận được dữ liệu tử master");

			if (data.type == 'WELCOME') {
				console.log(data.message)
			}
			else if (data.type == 'RULES') {
				console.log("[Worker] Đã nhận được rules từ server, đang lưu...");
				parseRule(data.message);
			}
		} catch (err) {
			console.error(`[Worker] Lỗi đường truyền bị nghẽn!, ${err}`);
		}
	})

	ws.on('error', (error) => {
		console.error('[!] Lỗi kết nối WebSocket:', error.message);
	});

	ws.on('close', () => {
		console.log('[-] Kết nối tới Master đã bị đóng');
	})
}
