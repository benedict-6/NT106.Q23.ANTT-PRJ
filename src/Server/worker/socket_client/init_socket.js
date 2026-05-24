// khởi tạo và inject service và attach handler

import WebSocket from "ws";
import registerMasterHandler from './handlers/handlerMasterSocket.js'
import { setMasterSocket } from "./services/serviceMasterSocket.js";

let reconnectTimer = null;

export default function InitSocket(url) {
	const connect = () => {
		const ws = new WebSocket(url);

		setMasterSocket(ws);
		registerMasterHandler(ws);

		ws.on('close', () => {
			clearTimeout(reconnectTimer);
			reconnectTimer = setTimeout(() => {
				console.log('[Worker] Đang thử kết nối lại với Master Node...');
				connect();
			}, 3000);
		});

		ws.on('error', () => {
			// Lỗi đường truyền, 'close' event sẽ được kích hoạt sau đó
		});

		return ws;
	};

	return connect();
}