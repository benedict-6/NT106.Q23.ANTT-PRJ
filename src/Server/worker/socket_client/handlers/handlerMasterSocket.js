// Dùng để xử lý các event của socket, event khác với các hành động

import { workerConfig } from '../../../shared/config/index.js';
import { parseRule } from '../../engine/parser.js';
import { sendToMaster } from '../services/serviceMasterSocket.js';
import { updateKeyCache } from '../../middleware/verifyAgentSession.js';

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
			else if (data.type === 'AGENT_KEYS_SYNC') {
				console.log("[Worker] Đã nhận toàn bộ danh sách khóa Agent từ Master, lưu vào RAM...");
				for (const [agent_id, secret_key] of Object.entries(data.payload)) {
					updateKeyCache(agent_id, secret_key);
				}
			}
			else if (data.type === 'NEW_AGENT_KEY') {
				console.log(`[Worker] Cập nhật khóa mới cho Agent ${data.agent_id} vào RAM`);
				updateKeyCache(data.agent_id, data.secret_key);
			}
		} catch (err) {
			console.error(`[Worker] Lỗi xử lý tin nhắn từ Master:`, err);
		}
	})

	ws.on('error', (error) => {
		console.error('[!] Lỗi kết nối WebSocket:', error.message);
	});

	ws.on('close', () => {
		console.log('[-] Kết nối tới Master đã bị đóng');
	})
}
