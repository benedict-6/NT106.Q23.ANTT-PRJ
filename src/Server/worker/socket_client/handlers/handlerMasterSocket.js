import WebSocket, {WebSocketServer} from 'ws';
import { workerConfig } from '../../../shared/config/index.js';

export default function initMasterWebSocket(url = 'ws://localhost:6000'){
	const MY_WORKER_ID = workerConfig.ID1 || `WORKER-${Math.floor(Math.random() * 1000)}`;

	const ws = new WebSocket(url);

	ws.on('connection', () =>{
		console.log('[+] Đã kết nối tới Master Node! Đang định danh..');

		ws.send(
			JSON.stringify({
				type: 'REGISTER_WORKER',
				worker_id: MY_WORKER_ID
			})
		);
	});

	ws.on('message', (msg) => {
		console.log(`[Worker] Master phản hồi: ${msg.toString()}`);

	})

	ws.on('error', (error) => {
        console.error('[!] Lỗi kết nối WebSocket:', error.message);
    });

	ws.on('close', () =>{
        console.log('[-] Kết nối tới Master đã bị đóng');
	})

	return ws;
}	