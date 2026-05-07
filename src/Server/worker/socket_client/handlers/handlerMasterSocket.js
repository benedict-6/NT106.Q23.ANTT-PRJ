import WebSocket, { WebSocketServer } from 'ws';
import { workerConfig } from '../../../shared/config/index.js';
import { parseRule } from '../../engine/ruleMatcher.js';

let socketInstance = null;

export default function initMasterWebSocket(url = 'ws://localhost:6000') {
	const MY_WORKER_ID = workerConfig.ID1 || `WORKER-${Math.floor(Math.random() * 1000)}`;

	const ws = new WebSocket(url);

	socketInstance = ws;

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
		socketInstance = null;
	});

	ws.on('close', () => {
		console.log('[-] Kết nối tới Master đã bị đóng');
		socketInstance = null;
	})

	return ws;
}

export function sendToMaster(msg) {
	if (socketInstance && socketInstance.readyState === 1) {
		socketInstance.send(JSON.stringify(msg));
	}
	else {
		console.error("[Master] Server chưa sẵn sàng!")
	}
}