// master/socket/handlers.js

// Websocket
import { WebSocketServer } from 'ws';
import { updateLastActive } from "../services/agentService.js";
import { getAllRules } from "../services/ruleLoader.js";
import { activeUIs } from "./uiHandler.js";

export const activeWorkers = new Map();

export default function WebsocketHandler(port) {
	const wss = new WebSocketServer({ port });

	// Danh bạ lưu trữ các kết nối đang sống (Active connections)
	// Key: worker_id, Value: WebSocket object
	wss.on('connection', (ws, req) => {
		// Lấy IP của Worker từ request kết nối
		const workerIp = req.socket.remoteAddress;
		console.log(`[+] Có một kết nối WebSocket mới từ IP: ${workerIp}... Đang chờ định danh.`);

		const authTimeout = setTimeout(() => {
			console.log(`[!] Báo động: Kết nối từ ${workerIp} không chịu định danh. Đang hủy...`);
			// Mã 4001: Lỗi tùy chỉnh báo hiệu hết thời gian xác thực
			ws.close(4001, "Timeout: Không nhận được gói tin định danh");
		}, 5000);

		ws.on('message', async (message) => {
			try {
				const data = JSON.parse(message);
				console.log(`Nhận được dữ liệu từ worker:`, data);

				if (data.type == 'REGISTER_WORKER') {
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

					// getAllRules() là hàm async, phải có await để đợi DB trả kết quả
					const rules = await getAllRules();
					ws.send(
						JSON.stringify({
							type: 'RULES',
							message: rules
						})
					)
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

					// Chuyển tiếp cho UI
					if (activeUIs && activeUIs.size > 0) {
						const logMessage = JSON.stringify({
							type: 'NEW_LOG_UI',
							agent_id: data.agent_id,
							payload: data.payload,
							time: new Date().toISOString()
						});

						activeUIs.forEach(uiClient => {
							if (uiClient.readyState === 1) {
								uiClient.send(logMessage);
							}
						});
					}
				}

				if (data.type === 'UPDATE_LAST_ACTIVE') {
					try {
						const { agent_id } = data.payload;
						await updateLastActive(agent_id);

						// Chuyển tiếp trạng thái online lên UI nếu có UI đang mở
						if (activeUIs && activeUIs.size > 0) {
							const statusMessage = JSON.stringify({
								type: 'AGENT_STATUS_UPDATE',
								agent_id: agent_id,
								status: 'online',
								last_active: new Date().toISOString()
							});
							activeUIs.forEach(uiClient => {
								if (uiClient.readyState === 1) {
									uiClient.send(statusMessage);
								}
							});
						}
					} catch (err) {
						console.error(`[Master] Lỗi cập nhật last_active cho Agent:`, err.message);
					}
					return;
				}

				if (data.type === 'RULE_ALERT') {
					console.log(`[Master] Nhận cảnh báo từ Agent [${data.agent_id}]! Đang kiểm tra để chuyển tiếp cho UI...`);

					// Chỉ xử lý chuyển tiếp nếu có UI đang kết nối
					if (activeUIs && activeUIs.size > 0) {
						// Đóng gói gói tin chuẩn (không bung data payload để tránh hỏng dữ liệu gốc)
						const alertMessage = JSON.stringify({
							type: 'NEW_ALERT_UI',
							agent_id: data.agent_id,
							payload: data.payload,
							time: new Date().toISOString()
						});

						// Gửi data lên UI
						activeUIs.forEach(uiClient => {
							if (uiClient.readyState === 1) {
								uiClient.send(alertMessage);
							}
						});
					} else {
						// console.log(`[Master] Bỏ qua chuyển tiếp do không có UI nào đang kết nối.`);
					}
				}
			}
			catch (err) {
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



