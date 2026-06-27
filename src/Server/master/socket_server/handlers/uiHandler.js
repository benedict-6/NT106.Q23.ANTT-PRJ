import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { getDashboardOverview, getFimLogs, getNetProLogs, getSyslogs, getApplications } from '../services/dashboardService.js';

// Danh bạ lưu các kết nối UI đang sống (Active UIs)
export const activeUIs = new Set();

export default function UIHandler(port) {
    const wss = new WebSocketServer({ port });

    wss.on('connection', (ws, req) => {
        console.log(`[+] Có một UI vừa kết nối tới cổng ${port}... Đang chờ Token xác thực.`);

        const authTimeout = setTimeout(() => {
            console.log(`[!] Báo động: UI không chịu xác thực. Đang hủy...`);
            ws.close(4001, "Timeout: Không nhận được token");
        }, 5000);

        // LISTEN
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                // ĐĂNG KÝ
                if (data.type === 'REGISTER_UI') {
                    const token = data.token;

                    if (!token) {
                        ws.close(4003, "Forbidden: Thiếu Token");
                        return;
                    }

                    try {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        ws.user = decoded;

                        clearTimeout(authTimeout); // Xác thực thành công 
                        activeUIs.add(ws); // LƯU VÀO DANH SÁCH

                        console.log(`[+] UI User [${decoded.userId}] đã vào mạng lưới. Tổng UI: ${activeUIs.size}`);
                        ws.send(JSON.stringify({ type: 'WELCOME', message: 'Xác thực WebSocket UI thành công!' }));
                    } catch (err) {
                        console.warn(`[!] UI gửi Token sai hoặc hết hạn.`);
                        ws.close(4003, "Forbidden: Token không hợp lệ");
                    }
                    return;
                }

                // UI YÊU CẦU LẤY DỮ LIỆU TỔNG QUAN
                if (data.type === 'FETCH_DASHBOARD_DATA') {
                    if (!ws.user) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: 'Bạn chưa xác thực!' }));
                        return;
                    }

                    try {
                        const dashboardData = await getDashboardOverview(ws.user.userId);
                        ws.send(JSON.stringify({
                            type: 'DASHBOARD_DATA_RESPONSE',
                            payload: dashboardData
                        }));
                    } catch (err) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: 'Lỗi khi tải dữ liệu thống kê từ DB.' }));
                    }
                    return;
                }

                // UI YÊU CẦU LẤY LOGS FIM
                if (data.type === 'FETCH_FIM_LOGS') {
                    if (!ws.user) return ws.send(JSON.stringify({ type: 'ERROR', message: 'Chưa xác thực!' }));
                    try {
                        const logs = await getFimLogs(ws.user.userId, data.agent_id, data.timeRange, data.page);
                        ws.send(JSON.stringify({ type: 'FIM_LOGS_RESPONSE', payload: logs }));
                    } catch (err) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
                    }
                    return;
                }

                // UI YÊU CẦU LẤY LOGS NETPRO
                if (data.type === 'FETCH_NETPRO_LOGS') {
                    if (!ws.user) return ws.send(JSON.stringify({ type: 'ERROR', message: 'Chưa xác thực!' }));
                    try {
                        const logs = await getNetProLogs(ws.user.userId, data.agent_id, data.timeRange, data.page);
                        ws.send(JSON.stringify({ type: 'NETPRO_LOGS_RESPONSE', payload: logs }));
                    } catch (err) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
                    }
                    return;
                }

                // UI YÊU CẦU LẤY LOGS SYSTEM/SYSLOG
                if (data.type === 'FETCH_SYSLOGS') {
                    if (!ws.user) return ws.send(JSON.stringify({ type: 'ERROR', message: 'Chưa xác thực!' }));
                    try {
                        const logs = await getSyslogs(ws.user.userId, data.agent_id, data.timeRange, data.page);
                        ws.send(JSON.stringify({ type: 'SYSLOGS_RESPONSE', payload: logs }));
                    } catch (err) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
                    }
                    return;
                }

                // UI YÊU CẦU LẤY ỨNG DỤNG/SOFTWARE INVENTORY
                if (data.type === 'FETCH_APPLICATIONS') {
                    if (!ws.user) return ws.send(JSON.stringify({ type: 'ERROR', message: 'Chưa xác thực!' }));
                    try {
                        const apps = await getApplications(ws.user.userId, data.agent_id, data.timeRange, data.page);
                        ws.send(JSON.stringify({ type: 'APPLICATIONS_RESPONSE', payload: apps }));
                    } catch (err) {
                        ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
                    }
                    return;
                }

            } catch (err) {
                console.error('Lỗi parse JSON hoặc xử lý request từ UI:', err);
            }
        });

        // Khi UI đóng tab hoặc F5
        ws.on('close', () => {
            if (ws.user) {
                activeUIs.delete(ws); // Xóa khỏi danh bạ
                console.log(`[-] UI User [${ws.user.userId}] đã ngắt kết nối. Còn lại: ${activeUIs.size}`);
            }
        });
    });

    console.log(`Master Node WebSocket (UI-Listener) chạy trên cổng ${port}`);
    return wss;
}