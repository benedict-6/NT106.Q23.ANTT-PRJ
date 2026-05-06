// master/socket/handlers.js

// Websocket
import { WebSocketServer } from 'ws';
import { updateLastActive } from "../services/agentService.js";
import { getAllRules } from "../services/ruleService.js";
import pool from "../../../shared/database/connect.js";

export 	const activeWorkers = new Map();

export default function initWorkerWebSocket(port) {
	const wss = new WebSocketServer({ port});

	// Danh bạ lưu trữ các kết nối đang sống (Active connections)
	// Key: worker_id, Value: WebSocket object
	wss.on('connection', (ws, req) => {
		console.log(`[+] Có một kết nối WebSocket mới... Đang chờ định danh.`);
	
		const authTimeout = setTimeout(() => {
			console.log(`[!] Báo động: Kết nối từ ${workerIp} không chịu định danh. Đang hủy...`);
			// Mã 4001: Lỗi tùy chỉnh báo hiệu hết thời gian xác thực
			ws.close(4001, "Timeout: Không nhận được gói tin định danh"); 
		}, 5000);

		ws.on('message', async (message) => {
			try {
				const data = JSON.parse(message);
				console.log(`Nhận được dữ liệu từ worker:`, data);

				if(data.type == 'REGISTER_WORKER'){
					const workerID = data.worker_id;

					if (!workerID) {
						console.warn(`[!] Phát hiện định danh giả mạo hoặc không hợp lệ từ ${workerIp}.`);
						ws.close(4003, "Forbidden: ID Worker không hợp lệ hoặc bị cấm");
						return; // Chặn 
					}

					clearTimeout(authTimeout);
					ws.workerID = workerID;
					activeWorkers.set(workerID, ws);

					console.log(`[+] Worker [${workerID}] đã gia nhập mạng lưới. Tổng số Worker: ${activeWorkers.size}`);
					ws.send(JSON.stringify({ type: 'WELCOME', message: 'Đăng ký thành công!' }));
					return; 
				}
				if (!ws.workerID) {
					console.warn(`[!] Máy lạ ${workerIp} đang cố gửi log trái phép. Đóng kết nối!`);
					ws.close(4001, "Unauthorized: Cần định danh trước khi gửi log");
					return;
				}

				if (data.type === 'AGENT_LOG') {
					console.log(`[Master] Nhận Log từ Worker [${ws.workerID}]:`, data.payload);
					// Lưu DB...
				}

				if (data.type === 'UPDATE_LAST_ACTIVE') {
					try {
						const { agent_id } = data.payload;
						await pool.query(
							"UPDATE agents SET last_active = NOW() WHERE agent_id = $1",
							[agent_id]
						);
						// console.log(`[Master] Cập nhật last_active cho Agent [${agent_id}] thành công.`);
					} catch (err) {
						console.error(`[Master] Lỗi cập nhật last_active cho Agent:`, err.message);
					}
					return;
				}

				if (data.type === 'FIM_ALERT') {
					console.log(`[Master] File ${data.payload.file_path} bị thay đổi! Đang xử lý...`);
					
					// Gửi thẳng cho tất cả các tab UI đang mở
					const alertMessage = JSON.stringify({
						type: 'FIM_ALERT_UI',
						payload: {
							level: 'CRITICAL',
							...data.payload, // bung toàn bộ agent_id, file_path, hashes ra
							time: new Date()
						}
					});

					//Giả sử gửi data lên UI
					// activeUIs.forEach(uiClient => {
					// 	if (uiClient.readyState === 1) uiClient.send(alertMessage);
					// });
				}
			}
			catch(err){
				console.error('Lõi parse JSON từ worker:', err);
			}
		});

		ws.on('close', () => {
			if (ws.workerID) {
				activeWorkers.delete(ws.workerID);
				console.log(`[-] Worker [${ws.workerID}] đã sập/ngắt kết nối. Còn lại: ${activeWorkers.size}`);
			}    
		});
	});

	console.log("Master Node WebSocket (Worker-Listener) chạy trên cổng 6000");
	return wss;
}



